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
import { format, differenceInCalendarDays } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { submitBusinessTrip, uploadClockFileBase64 } from '@/lib/api/attendance';
import { fetchProjects } from '@/lib/api/finance';

export interface BusinessTripModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const TRANSPORTATION_OPTIONS = [
    { id: 'plane', label: 'Plane (Pesawat)' },
    { id: 'train', label: 'Train (Kereta Api)' },
    { id: 'car', label: 'Car / Rental' },
    { id: 'bus', label: 'Bus / Travel' },
    { id: 'other', label: 'Other' },
];

export function BusinessTripModal({ visible, onClose, onSuccess }: BusinessTripModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const greenColor = '#34C759';

    const { user } = useUserContext();

    // Form states
    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState<Date>(() => new Date());
    const [endDate, setEndDate] = useState<Date>(() => new Date());
    const [purpose, setPurpose] = useState('');
    const [transportIndex, setTransportIndex] = useState(0);
    const [accommodation, setAccommodation] = useState('');
    const [estimatedCost, setEstimatedCost] = useState('');
    const [projectIndex, setProjectIndex] = useState(0);
    const [projects, setProjects] = useState<any[]>([]);
    const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset when opened
    useEffect(() => {
        if (visible) {
            fetchProjects().then(p => {
                setProjects(p || []);
            }).catch(() => {});

            setDestination('');
            const today = new Date();
            setStartDate(today);
            setEndDate(today);
            setPurpose('');
            setTransportIndex(0);
            setAccommodation('');
            setEstimatedCost('');
            setProjectIndex(0);
            setAttachment(null);
            setIsSubmitting(false);
        }
    }, [visible]);

    const projectOptions = useMemo(() => {
        return ['General / Non-Project', ...projects.map(p => p.name || p.title || 'Project')];
    }, [projects]);

    const calculatedDays = useMemo(() => {
        const diff = differenceInCalendarDays(endDate, startDate);
        return Math.max(1, diff + 1);
    }, [startDate, endDate]);

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
            Alert.alert('Authentication Error', 'You must be logged in to submit a request.');
            return;
        }

        if (!destination.trim()) {
            Alert.alert('Validation Error', 'Please enter the trip destination.');
            return;
        }

        if (endDate < startDate) {
            Alert.alert('Invalid Date Range', 'End date cannot be earlier than start date.');
            return;
        }

        if (!purpose.trim()) {
            Alert.alert('Validation Error', 'Please describe the business purpose of the trip.');
            return;
        }

        setIsSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            let uploadedFileUrl: string | undefined = undefined;

            if (attachment?.base64) {
                const ext = attachment.uri.split('.').pop() || 'jpg';
                const fileName = `trip_${user.id}_${Date.now()}.${ext}`;
                const uploadRes = await uploadClockFileBase64(
                    attachment.base64,
                    fileName,
                    attachment.mimeType || 'image/jpeg'
                );
                if (uploadRes) uploadedFileUrl = uploadRes;
            }

            const cleanCost = estimatedCost.replace(/[^0-9]/g, '');
            const costNum = cleanCost ? parseInt(cleanCost, 10) : undefined;
            const selectedProjectId = projectIndex > 0 ? projects[projectIndex - 1]?.id : undefined;

            const res = await submitBusinessTrip({
                userId: user.id,
                destination: destination.trim(),
                startDate: format(startDate, 'yyyy-MM-dd'),
                endDate: format(endDate, 'yyyy-MM-dd'),
                purpose: purpose.trim(),
                projectId: selectedProjectId,
                transportation: TRANSPORTATION_OPTIONS[transportIndex]?.label || 'Plane',
                accommodation: accommodation.trim() || undefined,
                estimatedCost: costNum,
                fileUrl: uploadedFileUrl,
            });

            if (res.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Trip Requested', 'Your business trip request has been submitted for approval.');
                onSuccess();
                onClose();
            } else {
                throw new Error(res.error || 'Failed to submit business trip request.');
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
                                Business Trip
                            </SwiftUIText>
                            <SwiftUIText size={13} color={subtextColor}>
                                Official work-related travel & assignment
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
                        {/* Section 1: Destination & Dates */}
                        <Section title="Destination & Schedule">
                            <TextField
                                placeholder="e.g. Jakarta HQ, Surabaya Site Visit"
                                defaultValue={destination}
                                onChangeText={setDestination}
                            />

                            <DateTimePicker
                                title="Departure Date"
                                initialDate={startDate.toISOString()}
                                displayedComponents="date"
                                variant="compact"
                                color={greenColor}
                                onDateSelected={(selectedDate) => {
                                    setStartDate(selectedDate);
                                    if (endDate < selectedDate) {
                                        setEndDate(selectedDate);
                                    }
                                }}
                            />

                            <DateTimePicker
                                title="Return Date"
                                initialDate={endDate.toISOString()}
                                displayedComponents="date"
                                variant="compact"
                                color={greenColor}
                                onDateSelected={(selectedDate) => {
                                    setEndDate(selectedDate);
                                }}
                            />

                            <LabeledContent label="Duration">
                                <SwiftUIText size={15} weight="semibold" color={greenColor}>
                                    {`${calculatedDays} ${calculatedDays === 1 ? 'Day' : 'Days'}`}
                                </SwiftUIText>
                            </LabeledContent>
                        </Section>

                        {/* Section 2: Purpose & Project */}
                        <Section title="Purpose & Project">
                            <Picker
                                label="Project Link"
                                options={projectOptions}
                                selectedIndex={projectIndex}
                                onOptionSelected={(e: any) => {
                                    setProjectIndex(e.nativeEvent.index);
                                }}
                                variant="menu"
                                color={greenColor}
                            />

                            <TextField
                                placeholder="Describe the business purpose or objective..."
                                defaultValue={purpose}
                                onChangeText={setPurpose}
                            />
                        </Section>

                        {/* Section 3: Travel & Accommodation */}
                        <Section title="Travel Details & Budget">
                            <Picker
                                label="Transportation"
                                options={TRANSPORTATION_OPTIONS.map(t => t.label)}
                                selectedIndex={transportIndex}
                                onOptionSelected={(e: any) => {
                                    setTransportIndex(e.nativeEvent.index);
                                }}
                                variant="menu"
                                color={greenColor}
                            />

                            <TextField
                                placeholder="Hotel name, address, or lodgings (if known)"
                                defaultValue={accommodation}
                                onChangeText={setAccommodation}
                            />

                            <TextField
                                placeholder="Estimated Budget (IDR) e.g. 2,500,000"
                                defaultValue={estimatedCost}
                                onChangeText={setEstimatedCost}
                            />
                        </Section>

                        {/* Section 4: Document / Attachment */}
                        <Section title="Supporting Document (Optional)">
                            <HStack alignment="center">
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={15} color={textColor}>
                                        {attachment ? 'Document Attached' : 'Assignment Letter / Itinerary'}
                                    </SwiftUIText>
                                    <SwiftUIText size={12} color={subtextColor}>
                                        {attachment ? 'Ready to upload on submit' : 'Upload assignment letter or ticket'}
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Button
                                    systemImage="camera.fill"
                                    onPress={handlePickAttachment}
                                    color={greenColor}
                                >
                                    <SwiftUIText size={14} weight="medium" color={greenColor}>
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
                                        Remove Document
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
