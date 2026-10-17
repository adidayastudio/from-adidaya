import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert, Image, ActivityIndicator, Platform } from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { submitBusinessTrip, uploadClockFileBase64 } from '@/lib/api/attendance';
import { LiquidDatePicker } from '@/components/ui/LiquidDatePicker';
import * as ImagePicker from 'expo-image-picker';
import { format, differenceInCalendarDays, startOfToday } from 'date-fns';

interface BusinessTripModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const TRANSPORTATION_MODES = [
    { id: 'plane', label: 'Plane', icon: 'airplane' },
    { id: 'train', label: 'Train', icon: 'train' },
    { id: 'car', label: 'Car/Rental', icon: 'car' },
    { id: 'bus', label: 'Bus', icon: 'bus' },
    { id: 'other', label: 'Other', icon: 'map' },
];

export function BusinessTripModal({ visible, onClose, onSuccess }: BusinessTripModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const { user } = useUserContext();

    // Form states
    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [purpose, setPurpose] = useState('');
    const [transportation, setTransportation] = useState('');
    const [accommodation, setAccommodation] = useState('');
    const [estimatedCost, setEstimatedCost] = useState('');
    const [notes, setNotes] = useState('');
    const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pickers
    const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);

    // Reset on open
    useEffect(() => {
        if (visible) {
            setDestination('');
            setStartDate('');
            setEndDate('');
            setPurpose('');
            setTransportation('');
            setAccommodation('');
            setEstimatedCost('');
            setNotes('');
            setAttachment(null);
            setIsSubmitting(false);
        }
    }, [visible]);

    const today = startOfToday();
    const durationDays = useMemo(() => {
        if (!startDate || !endDate) return 0;
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            return differenceInCalendarDays(end, start) + 1;
        } catch {
            return 0;
        }
    }, [startDate, endDate]);

    const isNoticeValid = useMemo(() => {
        if (!startDate) return true;
        try {
            const start = new Date(startDate);
            const daysNotice = differenceInCalendarDays(start, today);
            return daysNotice >= 3;
        } catch {
            return true;
        }
    }, [startDate]);

    const handlePickAttachment = async () => {
        Alert.alert(
            'Select Source',
            'Choose where to attach supporting doc from:',
            [
                {
                    text: 'Camera',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permission Denied', 'Camera access is required.');
                            return;
                        }
                        const result = await ImagePicker.launchCameraAsync({
                            mediaTypes: ['images'],
                            quality: 0.8,
                            base64: true
                        });
                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            setAttachment(result.assets[0]);
                        }
                    }
                },
                {
                    text: 'Photo Library',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permission Denied', 'Gallery access is required.');
                            return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ['images'],
                            quality: 0.8,
                            base64: true
                        });
                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            setAttachment(result.assets[0]);
                        }
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handleSubmit = async () => {
        if (!destination || !startDate || !endDate || !purpose) {
            Alert.alert('Error', 'Please fill in all required fields.');
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
                    'trips'
                );
            }

            await submitBusinessTrip({
                userId: user!.id,
                destination,
                startDate,
                endDate,
                purpose,
                transportation: transportation || undefined,
                accommodation: accommodation || undefined,
                estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
                notes: notes || undefined,
                fileUrl: fileUrl || undefined
            });

            Alert.alert('Success', 'Business trip request submitted successfully!');
            onSuccess();
            onClose();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit trip request.');
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
                    <Text style={[s.headerTitle, { color: textColor }]}>Business Trip</Text>
                    <TouchableOpacity onPress={onClose} disabled={isSubmitting} style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                        <PlatformIcon name="xmark" size={16} tintColor={subtextColor} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
                    {/* Destination */}
                    <View style={s.section}>
                        <Text style={[s.label, { color: subtextColor }]}>Destination</Text>
                        <TextInput
                            style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                            placeholder="e.g. Jakarta HQ, Surabaya Site Visit"
                            placeholderTextColor={subtextColor}
                            value={destination}
                            onChangeText={setDestination}
                        />
                    </View>

                    {/* Dates */}
                    <View style={s.section}>
                        <Text style={[s.sectionTitle, { color: textColor }]}>Dates & Duration</Text>
                        <View style={s.row}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={[s.label, { color: subtextColor }]}>Start Date</Text>
                                <TouchableOpacity 
                                    style={[s.inputTrigger, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                    onPress={() => setActiveDatePicker('start')}
                                >
                                    <Text style={{ color: startDate ? textColor : subtextColor }}>
                                        {startDate ? format(new Date(startDate), 'yyyy-MM-dd') : 'YYYY-MM-DD'}
                                    </Text>
                                    <PlatformIcon name="calendar" size={14} tintColor={subtextColor} />
                                </TouchableOpacity>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={[s.label, { color: subtextColor }]}>End Date</Text>
                                <TouchableOpacity 
                                    style={[s.inputTrigger, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
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
                        </View>

                        {/* Notice Warning */}
                        {startDate && !isNoticeValid && (
                            <View style={s.noticeWarning}>
                                <PlatformIcon name="exclamationmark.triangle.fill" size={14} tintColor="#FF9500" />
                                <Text style={s.noticeWarningText}>
                                    Short Notice: Business trips typically require at least 3 days advance notice. Special approval may be needed.
                                </Text>
                            </View>
                        )}

                        {durationDays > 0 && (
                            <View style={[s.durationCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}>
                                <Text style={[s.durationLabel, { color: subtextColor }]}>Total Duration</Text>
                                <Text style={[s.durationVal, { color: textColor }]}>{durationDays} Days</Text>
                            </View>
                        )}
                    </View>

                    {/* Purpose of Trip */}
                    <View style={s.section}>
                        <Text style={[s.label, { color: subtextColor }]}>Purpose of Trip</Text>
                        <TextInput
                            style={[s.textArea, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                            placeholder="Describe the business purpose..."
                            placeholderTextColor={subtextColor}
                            multiline
                            numberOfLines={4}
                            value={purpose}
                            onChangeText={setPurpose}
                        />
                    </View>

                    {/* Transportation mode */}
                    <View style={s.section}>
                        <Text style={[s.label, { color: subtextColor }]}>Transportation Mode</Text>
                        <View style={s.transportList}>
                            {TRANSPORTATION_MODES.map(mode => {
                                const isSelected = transportation === mode.id;
                                return (
                                    <TouchableOpacity
                                        key={mode.id}
                                        style={[
                                            s.transportCard,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' },
                                            isSelected && { borderColor: '#0EA5E9', borderWidth: 1 }
                                        ]}
                                        onPress={() => setTransportation(mode.id)}
                                    >
                                        <PlatformIcon name={mode.icon as any} size={20} tintColor={isSelected ? '#0EA5E9' : subtextColor} />
                                        <Text style={[s.transportLabel, { color: textColor }, isSelected && { color: '#0EA5E9', fontWeight: '700' }]}>{mode.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Accommodation */}
                    <View style={s.section}>
                        <Text style={[s.label, { color: subtextColor }]}>Accommodation Details</Text>
                        <TextInput
                            style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                            placeholder="Hotel name, address (if known)"
                            placeholderTextColor={subtextColor}
                            value={accommodation}
                            onChangeText={setAccommodation}
                        />
                    </View>

                    {/* Estimated Cost */}
                    <View style={s.section}>
                        <Text style={[s.label, { color: subtextColor }]}>Estimated Cost (IDR)</Text>
                        <TextInput
                            style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                            placeholder="e.g. 5000000"
                            placeholderTextColor={subtextColor}
                            keyboardType="numeric"
                            value={estimatedCost}
                            onChangeText={setEstimatedCost}
                        />
                    </View>

                    {/* Attachment */}
                    <View style={s.section}>
                        <Text style={[s.label, { color: subtextColor }]}>Supporting Document (Optional)</Text>
                        <TouchableOpacity style={[s.uploadBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]} onPress={handlePickAttachment}>
                            {attachment ? (
                                <Image source={{ uri: attachment.uri }} style={s.previewImg} />
                            ) : (
                                <>
                                    <PlatformIcon name="doc.fill" size={24} tintColor={subtextColor} />
                                    <Text style={[s.uploadText, { color: subtextColor }]}>Upload Invitation / Agenda</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                </ScrollView>

                {/* Sticky Footer */}
                <View style={s.footer}>
                    <TouchableOpacity 
                        style={[s.submitBtn, { backgroundColor: !isNoticeValid ? '#FF9500' : '#0EA5E9' }]} 
                        onPress={handleSubmit} 
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={s.submitBtnText}>
                                {!isNoticeValid ? 'Submit with Warning' : 'Submit Request'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Liquid Date Picker */}
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
    closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 28, paddingTop: 8, paddingBottom: 40 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
    row: { flexDirection: 'row' },
    label: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
    input: {
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 16,
        fontSize: 15,
        fontWeight: '600',
    },
    inputTrigger: {
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    noticeWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(255,149,0,0.1)', padding: 10, borderRadius: 12 },
    noticeWarningText: { flex: 1, fontSize: 11, color: '#FF9500', fontWeight: '600', lineHeight: 15 },
    durationCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginTop: 12 },
    durationLabel: { fontSize: 13, fontWeight: '600' },
    durationVal: { fontSize: 15, fontWeight: '800' },
    transportList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    transportCard: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: 'transparent' },
    transportLabel: { fontSize: 13, fontWeight: '600' },
    uploadBox: { height: 120, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#8E8E93', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    uploadText: { fontSize: 13, fontWeight: '600', marginTop: 8 },
    previewImg: { width: '100%', height: '100%' },
    textArea: { minHeight: 100, borderRadius: 20, padding: 16, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
    footer: { paddingHorizontal: 28, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
    submitBtn: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
