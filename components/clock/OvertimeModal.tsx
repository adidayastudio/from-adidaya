import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert, Image, ActivityIndicator, Platform } from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { submitOvertimeLog, uploadClockFileBase64 } from '@/lib/api/attendance';
import { fetchProjects } from '@/lib/api/finance';
import { LiquidDatePicker } from '@/components/ui/LiquidDatePicker';
import * as ImagePicker from 'expo-image-picker';
import { format, differenceInHours, startOfToday } from 'date-fns';

interface OvertimeModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function OvertimeModal({ visible, onClose, onSuccess }: OvertimeModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const { user } = useUserContext();

    // Form states
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [projectId, setProjectId] = useState('');
    const [projectCode, setProjectCode] = useState('');
    const [description, setDescription] = useState('');
    const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Projects list
    const [projects, setProjects] = useState<any[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [activeSelect, setActiveSelect] = useState(false);

    // Pickers
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Load projects
    useEffect(() => {
        if (visible) {
            setLoadingProjects(true);
            fetchProjects()
                .then(data => {
                    const staticOptions = [{ id: 'ady_ops', project_code: 'ADY', project_name: 'Adidaya Ops (ADY)' }];
                    const dynamicOptions = data.map((p: any) => ({
                        id: p.id,
                        project_code: p.project_code,
                        project_name: p.project_name
                    }));
                    setProjects([...staticOptions, ...dynamicOptions]);
                })
                .catch(err => console.error(err))
                .finally(() => setLoadingProjects(false));

            // Reset
            setDate('');
            setStartTime('');
            setEndTime('');
            setProjectId('');
            setProjectCode('');
            setDescription('');
            setAttachment(null);
            setIsSubmitting(false);
        }
    }, [visible]);

    // Late Submission warning (Log date is more than 48 hours ago)
    const isLateSubmission = useMemo(() => {
        if (!date) return false;
        try {
            const logDate = new Date(date);
            const today = startOfToday();
            return differenceInHours(today, logDate) > 48;
        } catch {
            return false;
        }
    }, [date]);

    // Duration calculation
    const duration = useMemo(() => {
        if (!startTime || !endTime) return null;
        try {
            const [startH, startM] = startTime.split(':').map(Number);
            const [endH, endM] = endTime.split(':').map(Number);
            
            if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return null;

            let diff = (endH * 60 + endM) - (startH * 60 + startM);
            if (diff < 0) diff += 24 * 60; // Handle overnight work
            if (diff <= 0) return null;

            const h = Math.floor(diff / 60);
            const m = diff % 60;
            return `${h}h ${m}m`;
        } catch {
            return null;
        }
    }, [startTime, endTime]);

    const handlePickAttachment = async () => {
        Alert.alert(
            'Select Source',
            'Choose where to attach proof photo from:',
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
        if (!date || !startTime || !endTime || !projectId || !description) {
            Alert.alert('Error', 'Please fill in all required fields.');
            return;
        }

        // Validate time format
        const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            Alert.alert('Invalid Time', 'Please input time in HH:mm format (e.g. 17:30).');
            return;
        }

        setIsSubmitting(true);
        try {
            let photoUrl = '';
            if (attachment && attachment.base64) {
                const ext = attachment.uri.split('.').pop() || 'jpg';
                photoUrl = await uploadClockFileBase64(
                    attachment.base64,
                    ext,
                    attachment.mimeType || 'image/jpeg',
                    'overtime'
                );
            }

            await submitOvertimeLog({
                userId: user!.id,
                date,
                startTime,
                endTime,
                projectId,
                description,
                photoUrl: photoUrl || undefined
            });

            Alert.alert('Success', 'Overtime logged successfully!');
            onSuccess();
            onClose();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit overtime log.');
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
                    <Text style={[s.headerTitle, { color: textColor }]}>Log Overtime</Text>
                    <TouchableOpacity onPress={onClose} disabled={isSubmitting} style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                        <PlatformIcon name="xmark" size={16} tintColor={subtextColor} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {/* Late Submission warning */}
                    {isLateSubmission && (
                        <View style={s.warningCard}>
                            <PlatformIcon name="exclamationmark.triangle.fill" size={20} tintColor="#FF9500" />
                            <View style={s.warningContent}>
                                <Text style={s.warningTitle}>Late Submission Warning</Text>
                                <Text style={s.warningText}>You are logging overtime from more than 2 days ago. Please ensure your manager knows about this submission.</Text>
                            </View>
                        </View>
                    )}

                    {/* Date */}
                    <View style={s.section}>
                        <Text style={[s.label, { color: subtextColor }]}>Date of Overtime</Text>
                        <TouchableOpacity 
                            style={[s.inputTrigger, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={{ color: date ? textColor : subtextColor }}>
                                {date ? format(new Date(date), 'yyyy-MM-dd') : 'YYYY-MM-DD'}
                            </Text>
                            <PlatformIcon name="calendar" size={14} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Time Range */}
                    <View style={s.section}>
                        <Text style={[s.sectionTitle, { color: textColor }]}>Time Range</Text>
                        <View style={s.row}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={[s.label, { color: subtextColor }]}>Start Time (24h)</Text>
                                <TextInput
                                    style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                    value={startTime}
                                    onChangeText={setStartTime}
                                    placeholder="e.g. 17:30"
                                    placeholderTextColor={subtextColor}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.label, { color: subtextColor }]}>End Time (24h)</Text>
                                <TextInput
                                    style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                    value={endTime}
                                    onChangeText={setEndTime}
                                    placeholder="e.g. 21:00"
                                    placeholderTextColor={subtextColor}
                                />
                            </View>
                        </View>

                        {/* Duration Card */}
                        {duration && (
                            <View style={[s.durationCard, { backgroundColor: isDark ? 'rgba(52,199,89,0.1)' : 'rgba(52,199,89,0.05)' }]}>
                                <Text style={[s.durationLabel, { color: subtextColor }]}>Total Duration</Text>
                                <Text style={[s.durationVal, { color: '#34C759' }]}>{duration}</Text>
                            </View>
                        )}
                    </View>

                    {/* Project/Task Selection */}
                    <View style={s.section}>
                        <Text style={[s.label, { color: subtextColor }]}>Project / Task Category</Text>
                        <TouchableOpacity 
                            style={[s.inputTrigger, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                            onPress={() => setActiveSelect(true)}
                        >
                            <Text style={{ color: projectCode ? textColor : subtextColor }}>
                                {projectCode ? `${projectCode} - ${projects.find(p => p.id === projectId)?.project_name}` : 'Select project...'}
                            </Text>
                            <PlatformIcon name="chevron.down" size={12} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Description */}
                    <View style={s.section}>
                        <Text style={[s.label, { color: subtextColor }]}>Description of Work</Text>
                        <TextInput
                            style={[s.textArea, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                            placeholder="Briefly describe what you worked on..."
                            placeholderTextColor={subtextColor}
                            multiline
                            numberOfLines={4}
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    {/* Photo Proof */}
                    <View style={s.section}>
                        <Text style={[s.label, { color: subtextColor }]}>Photo Proof (Optional)</Text>
                        <TouchableOpacity style={[s.uploadBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]} onPress={handlePickAttachment}>
                            {attachment ? (
                                <Image source={{ uri: attachment.uri }} style={s.previewImg} />
                            ) : (
                                <>
                                    <PlatformIcon name="camera.fill" size={24} tintColor={subtextColor} />
                                    <Text style={[s.uploadText, { color: subtextColor }]}>Upload Photo</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Sticky Footer */}
                <View style={s.footer}>
                    <TouchableOpacity style={[s.submitBtn, { backgroundColor: '#0EA5E9' }]} onPress={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={s.submitBtnText}>Submit Log</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Liquid Date Picker Modal */}
                <LiquidDatePicker
                    visible={showDatePicker}
                    onClose={() => setShowDatePicker(false)}
                    onSelect={(selectedDate) => setDate(selectedDate)}
                    currentDate={date || undefined}
                    title="Select Overtime Date"
                />

                {/* Project Selection Modal */}
                <Modal visible={activeSelect} transparent animationType="fade">
                    <View style={s.modalOverlay}>
                        <GlassView intensity={60} tint={isDark ? 'dark' : 'light'} style={[s.modalContent, { backgroundColor: isDark ? 'rgba(28,28,30,0.9)' : 'rgba(255,255,255,0.9)' }]}>
                            <View style={s.modalHeader}>
                                <Text style={[s.modalTitle, { color: textColor }]}>Select Project</Text>
                                <TouchableOpacity onPress={() => setActiveSelect(false)}>
                                    <PlatformIcon name="xmark.circle.fill" size={24} tintColor={subtextColor} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={{ maxHeight: 300 }}>
                                {loadingProjects ? (
                                    <ActivityIndicator size="small" color="#007AFF" style={{ margin: 20 }} />
                                ) : (
                                    projects.map((opt, idx) => (
                                        <TouchableOpacity 
                                            key={idx} 
                                            style={[s.modalOption, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                            onPress={() => {
                                                setProjectId(opt.id);
                                                setProjectCode(opt.project_code);
                                                setActiveSelect(false);
                                            }}
                                        >
                                            <Text style={[s.modalOptionText, { color: textColor }]}>{opt.project_code} - {opt.project_name}</Text>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>
                        </GlassView>
                    </View>
                </Modal>
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
    warningCard: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: 'rgba(255,149,0,0.1)', borderRadius: 20, marginBottom: 24, alignItems: 'flex-start' },
    warningContent: { flex: 1 },
    warningTitle: { fontSize: 14, fontWeight: '700', color: '#FF9500', marginBottom: 4 },
    warningText: { fontSize: 13, color: '#FF9500', lineHeight: 18 },
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
    durationCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginTop: 12 },
    durationLabel: { fontSize: 13, fontWeight: '600' },
    durationVal: { fontSize: 15, fontWeight: '800' },
    uploadBox: { height: 120, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#8E8E93', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    uploadText: { fontSize: 13, fontWeight: '600', marginTop: 8 },
    previewImg: { width: '100%', height: '100%' },
    textArea: { minHeight: 100, borderRadius: 20, padding: 16, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
    footer: { paddingHorizontal: 28, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
    submitBtn: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 24, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 17, fontWeight: '700' },
    modalOption: { paddingVertical: 16, borderBottomWidth: 1 },
    modalOptionText: { fontSize: 16, fontWeight: '500' }
});
