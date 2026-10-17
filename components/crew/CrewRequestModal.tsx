import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GlassView } from '../ui/GlassView';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { CrewRequest, CrewMember, Project, RequestType, RequestStatus, matchProjectCode } from './mockData';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadCrewFileBase64 } from '@/lib/api/attendance';

interface CrewRequestModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (request: CrewRequest) => void;
    request: CrewRequest | null;
    crewMembers: CrewMember[];
    projects: Project[];
    isEmbedded?: boolean;
}

export function CrewRequestModal({
    visible,
    onClose,
    onSave,
    request,
    crewMembers,
    projects,
    isEmbedded = false,
}: CrewRequestModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    // State fields
    const [selectedCrewId, setSelectedCrewId] = useState('');
    const [type, setType] = useState<RequestType>('LEAVE');
    const [projectCode, setProjectCode] = useState('');
    const [amount, setAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [status, setStatus] = useState<RequestStatus>('PENDING');
    const [proofFiles, setProofFiles] = useState<{ name: string; uri: string; mimeType?: string }[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [proofPickerVisible, setProofPickerVisible] = useState(false);
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [isCrewDropdownOpen, setIsCrewDropdownOpen] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const [crewSearchQuery, setCrewSearchQuery] = useState('');

    const filteredCrewMembers = useMemo(() => {
        return crewMembers.filter(member => {
            const matchesProject = !projectCode ? !member.projectCode : matchProjectCode(member.projectCode, projectCode);
            const matchesSearch = !crewSearchQuery.trim() || member.name.toLowerCase().includes(crewSearchQuery.toLowerCase()) || (member.role || '').toLowerCase().includes(crewSearchQuery.toLowerCase());
            return matchesProject && matchesSearch;
        });
    }, [crewMembers, projectCode, crewSearchQuery]);

    const selectedCrew = crewMembers.find(c => c.id === selectedCrewId);
    const selectedProject = projects.find(p => p.code === projectCode);

    useEffect(() => {
        const currentCrew = crewMembers.find(c => c.id === selectedCrewId);
        const match = projectCode ? matchProjectCode(currentCrew?.projectCode || '', projectCode) : !currentCrew?.projectCode;
        
        if (!match) {
            const filtered = crewMembers.filter(c => projectCode ? matchProjectCode(c.projectCode, projectCode) : !c.projectCode);
            if (filtered.length > 0) {
                setSelectedCrewId(filtered[0].id);
            } else {
                setSelectedCrewId('');
            }
        }
    }, [projectCode, crewMembers]);

    useEffect(() => {
        if (request) {
            setSelectedCrewId(request.crewId);
            setType(request.type);
            setProjectCode(request.projectCode || '');
            setAmount(request.amount ? String(request.amount) : '');
            setStartDate(request.startDate);
            setEndDate(request.endDate || '');
            setReason(request.reason);
            if (request.proofUrl) {
                const urls = request.proofUrl.split(',').filter(Boolean);
                setProofFiles(urls.map(url => ({
                    name: url.trim().split('/').pop() || 'proof.pdf',
                    uri: url.trim()
                })));
            } else {
                setProofFiles([]);
            }
            setStatus(request.status);
        } else {
            // Default project code first
            const defaultProj = projects[0]?.code || '';
            setProjectCode(defaultProj);
            setType('LEAVE');
            setAmount('');
            const today = new Date().toISOString().split('T')[0];
            setStartDate(today);
            setEndDate('');
            setReason('');
            setProofFiles([]);
            setStatus('PENDING');
        }
        setIsProjectDropdownOpen(false);
        setIsCrewDropdownOpen(false);
    }, [request, visible, crewMembers, projects]);

    const handlePickLibrary = async () => {
        setProofPickerVisible(false);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                quality: 0.5,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newFiles = result.assets.map(asset => ({
                    uri: asset.uri,
                    name: asset.fileName || asset.uri.split('/').pop() || `image-${Date.now()}`,
                    mimeType: asset.mimeType || 'image/jpeg',
                }));
                setProofFiles(prev => [...prev, ...newFiles]);
            }
        } catch (err) {
            console.log('ImagePicker Error:', err);
        }
    };

    const handlePickDocument = async () => {
        setProofPickerVisible(false);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
                multiple: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newFiles = result.assets.map(asset => ({
                    uri: asset.uri,
                    name: asset.name || asset.uri.split('/').pop() || `doc-${Date.now()}`,
                    mimeType: asset.mimeType || 'application/pdf',
                }));
                setProofFiles(prev => [...prev, ...newFiles]);
            }
        } catch (err) {
            console.log('DocumentPicker Error:', err);
        }
    };

    const removeProofFile = (index: number) => {
        setProofFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!selectedCrewId) {
            alert('Please select a crew member.');
            return;
        }
        if (!reason.trim()) {
            alert('Please enter a reason or description.');
            return;
        }
        if ((type === 'KASBON' || type === 'REIMBURSE') && !amount) {
            alert('Please specify the amount.');
            return;
        }
        if (type === 'REIMBURSE' && proofFiles.length === 0) {
            alert('Please upload a proof / receipt file (Image or PDF).');
            return;
        }
        if (!startDate) {
            alert('Please enter the date.');
            return;
        }
        if (type === 'LEAVE' && !endDate) {
            alert('Please select an end date for leave requests.');
            return;
        }

        const crew = crewMembers.find(c => c.id === selectedCrewId);
        if (!crew) {
            alert('Invalid crew member selected.');
            return;
        }

        setSubmitting(true);
        try {
            let proofUrl: string | undefined;
            if (type === 'REIMBURSE' && proofFiles.length > 0) {
                const uploadedUrls: string[] = [];
                for (const file of proofFiles) {
                    if (file.uri.startsWith('http')) {
                        uploadedUrls.push(file.uri);
                    } else {
                        const base64 = await FileSystem.readAsStringAsync(file.uri, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                        const ext = file.name.split('.').pop() || 'jpg';
                        const mimeType = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
                        const url = await uploadCrewFileBase64(base64, ext, mimeType);
                        uploadedUrls.push(url);
                    }
                }
                proofUrl = uploadedUrls.join(',');
            }

            const newRequest: CrewRequest = {
                id: request ? request.id : `r_${Date.now()}`,
                crewId: selectedCrewId,
                crewName: crew.name,
                crewRole: crew.role,
                projectCode: projectCode || undefined,
                type,
                amount: (type === 'KASBON' || type === 'REIMBURSE') ? (Number(amount) || 0) : undefined,
                startDate,
                endDate: type === 'LEAVE' && endDate ? endDate : undefined,
                reason: reason.trim(),
                status,
                createdAt: request ? request.createdAt : new Date().toISOString(),
                proofUrl,
            };

            onSave(newRequest);
        } catch (err: any) {
            alert(err.message || 'Failed to upload proof files.');
        } finally {
            setSubmitting(false);
        }
    };

    const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
    const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    const containerStyle = isEmbedded
        ? [s.embeddedSheet, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]
        : [s.sheet, { backgroundColor: isDark ? '#121212' : '#F2F2F7' }];

    const content = (
        <View style={containerStyle}>
            {/* Header */}
            <View style={[s.header, isEmbedded && { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <Text style={[s.headerTitle, { color: textColor }]}>
                    Crew Request
                </Text>
                <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={24} color={isDark ? '#FFF' : '#000'} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[s.content, isEmbedded && { paddingHorizontal: 24, paddingBottom: 60, maxWidth: 840, width: '100%', alignSelf: 'center' }]} showsVerticalScrollIndicator={false}>
                            {/* Project & Profile Details */}
                            <Text style={[s.sectionTitle, { color: subtextColor }]}>PROFILE & PROJECT DETAILS</Text>
                            <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                {/* Project Selection */}
                                <Text style={[s.label, { color: subtextColor }]}>Project Code</Text>
                                <View style={s.dropdownContainer}>
                                    <TouchableOpacity
                                        style={[s.dropdownTrigger, { backgroundColor: inputBg, borderColor: inputBorder }]}
                                        onPress={() => !request && setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                                        activeOpacity={request ? 1.0 : 0.7}
                                    >
                                        <View style={s.dropdownTriggerLeft}>
                                            {selectedProject ? (
                                                 <>
                                                     <View style={[s.projectCodeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                                         <Text style={[s.projectCodeBadgeText, { color: textColor }]}>
                                                             {selectedProject.code}
                                                         </Text>
                                                     </View>
                                                     <Text style={[s.dropdownTriggerText, { color: textColor }]} numberOfLines={1}>
                                                         {selectedProject.name}
                                                     </Text>
                                                 </>
                                             ) : (
                                                 <Text style={[s.dropdownTriggerText, { color: textColor }]}>
                                                     No Project
                                                 </Text>
                                             )}
                                         </View>
                                         {!request && (
                                             <Ionicons
                                                 name={isProjectDropdownOpen ? 'chevron-up' : 'chevron-down'}
                                                 size={18}
                                                 color={subtextColor}
                                             />
                                         )}
                                     </TouchableOpacity>

                                     {isProjectDropdownOpen && (
                                         <View style={[s.dropdownList, { backgroundColor: isDark ? '#121212' : '#F2F2F7', borderColor: inputBorder }]}>
                                             <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                                 <TouchableOpacity
                                                     style={[
                                                         s.dropdownItem,
                                                         !projectCode && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                                                     ]}
                                                     onPress={() => {
                                                         setProjectCode('');
                                                         setIsProjectDropdownOpen(false);
                                                     }}
                                                 >
                                                     <View style={s.dropdownItemLeft}>
                                                         <Text style={[s.dropdownItemText, { color: textColor }, !projectCode && { fontWeight: '700' }]}>
                                                             No Project
                                                         </Text>
                                                     </View>
                                                     {!projectCode && (
                                                         <Ionicons name="checkmark" size={18} color={textColor} />
                                                     )}
                                                 </TouchableOpacity>

                                                 {projects.map(proj => {
                                                     const isSelected = projectCode === proj.code;
                                                     return (
                                                         <TouchableOpacity
                                                             key={proj.code}
                                                             style={[
                                                                 s.dropdownItem,
                                                                 isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                                                             ]}
                                                             onPress={() => {
                                                                 setProjectCode(proj.code);
                                                                 setIsProjectDropdownOpen(false);
                                                             }}
                                                         >
                                                             <View style={s.dropdownItemLeft}>
                                                                 <View style={[s.projectCodeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                                                     <Text style={[s.projectCodeBadgeText, { color: textColor }]}>
                                                                         {proj.code}
                                                                     </Text>
                                                                 </View>
                                                                 <Text style={[s.dropdownItemText, { color: textColor }, isSelected && { fontWeight: '700' }]} numberOfLines={1}>
                                                                     {proj.name}
                                                                 </Text>
                                                             </View>
                                                             {isSelected && (
                                                                 <Ionicons name="checkmark" size={18} color={textColor} />
                                                             )}
                                                         </TouchableOpacity>
                                                     );
                                                 })}
                                             </ScrollView>
                                         </View>
                                     )}
                                 </View>

                                 {/* Crew Member Selector */}
                                 <Text style={[s.label, { color: subtextColor, marginTop: 12 }]}>Crew Member</Text>
                                 <View style={s.dropdownContainer}>
                                     <TouchableOpacity
                                         style={[s.dropdownTrigger, { backgroundColor: inputBg, borderColor: inputBorder }]}
                                         onPress={() => !request && setIsCrewDropdownOpen(!isCrewDropdownOpen)}
                                         activeOpacity={request ? 1.0 : 0.7}
                                     >
                                         <View style={s.dropdownTriggerLeft}>
                                             {selectedCrew ? (
                                                 <>
                                                     <View style={[s.avatarSmall, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                                         <Text style={[s.avatarSmallText, { color: textColor }]}>{selectedCrew.initials}</Text>
                                                     </View>
                                                     <Text style={[s.dropdownTriggerText, { color: textColor }]}>
                                                         {selectedCrew.name}
                                                     </Text>
                                                 </>
                                             ) : (
                                                 <Text style={[s.dropdownTriggerText, { color: subtextColor }]}>
                                                     Select Crew Member
                                                 </Text>
                                             )}
                                         </View>
                                         {!request && (
                                             <Ionicons
                                                 name={isCrewDropdownOpen ? 'chevron-up' : 'chevron-down'}
                                                 size={18}
                                                 color={subtextColor}
                                             />
                                         )}
                                     </TouchableOpacity>

                                     {isCrewDropdownOpen && (
                                         <View style={[s.dropdownList, { backgroundColor: isDark ? '#121212' : '#F2F2F7', borderColor: inputBorder }]}>
                                             <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                                                 <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderRadius: 20, paddingHorizontal: 14, height: 38 }}>
                                                     <Ionicons name="search" size={15} color={subtextColor} style={{ marginRight: 8 }} />
                                                     <TextInput
                                                         style={{ flex: 1, fontSize: 13, color: textColor, paddingVertical: 0 }}
                                                         placeholder="Search crew member..."
                                                         placeholderTextColor={subtextColor}
                                                         value={crewSearchQuery}
                                                         onChangeText={setCrewSearchQuery}
                                                         autoCapitalize="none"
                                                     />
                                                     {crewSearchQuery ? (
                                                         <TouchableOpacity onPress={() => setCrewSearchQuery('')}>
                                                             <Ionicons name="close-circle" size={15} color={subtextColor} />
                                                         </TouchableOpacity>
                                                     ) : null}
                                                 </View>
                                             </View>
                                             <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                                 {filteredCrewMembers.length === 0 ? (
                                                     <Text style={{ padding: 16, textAlign: 'center', color: subtextColor, fontSize: 13 }}>No crew found</Text>
                                                 ) : (
                                                     filteredCrewMembers.map((crew: CrewMember) => {
                                                         const isSelected = selectedCrewId === crew.id;
                                                         return (
                                                             <TouchableOpacity
                                                                 key={crew.id}
                                                                 style={[
                                                                     s.dropdownItem,
                                                                     isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                                                                 ]}
                                                                 onPress={() => {
                                                                     setSelectedCrewId(crew.id);
                                                                     setIsCrewDropdownOpen(false);
                                                                 }}
                                                             >
                                                                 <View style={s.dropdownItemLeft}>
                                                                     <View style={[s.avatarSmall, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                                                         <Text style={[s.avatarSmallText, { color: textColor }]}>{crew.initials}</Text>
                                                                     </View>
                                                                     <Text style={[s.dropdownItemText, { color: textColor }, isSelected && { fontWeight: '700' }]}>
                                                                         {crew.name}
                                                                     </Text>
                                                                 </View>
                                                                 {isSelected && (
                                                                     <Ionicons name="checkmark" size={18} color={textColor} />
                                                                 )}
                                                             </TouchableOpacity>
                                                         );
                                                     })
                                                 )}
                                             </ScrollView>
                                         </View>
                                     )}
                                 </View>

                                 {/* Request Type Selector */}
                                 <Text style={[s.label, { color: subtextColor, marginTop: 12 }]}>Request Type</Text>
                                 <View style={s.segmentedContainer}>
                                     {(['LEAVE', 'KASBON', 'REIMBURSE'] as const).map(rType => {
                                         const isSelected = type === rType;
                                         let label = 'Leave';
                                         if (rType === 'KASBON') {
                                             label = 'Cash Advance';
                                         } else if (rType === 'REIMBURSE') {
                                             label = 'Reimburse';
                                         }

                                         return (
                                             <TouchableOpacity
                                                 key={rType}
                                                 style={[
                                                     s.segmentButton,
                                                     isSelected && { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }
                                                 ]}
                                                 onPress={() => setType(rType)}
                                             >
                                                 <Text style={[s.segmentText, { color: textColor, fontWeight: isSelected ? '700' : '400' }]}>
                                                     {label}
                                                 </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Conditional Inputs */}
                            <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>REQUEST DETAILS</Text>
                            <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                {/* Amount Input (Kasbon & Reimburse) */}
                                {(type === 'KASBON' || type === 'REIMBURSE') && (
                                    <View style={s.inputGroup}>
                                        <Text style={[s.label, { color: subtextColor }]}>Amount (Rp) *</Text>
                                        <TextInput
                                            style={[s.input, { color: textColor, backgroundColor: inputBg }]}
                                            value={amount}
                                            onChangeText={setAmount}
                                            keyboardType="numeric"
                                            placeholder="e.g. 500000"
                                            placeholderTextColor={subtextColor}
                                        />
                                    </View>
                                )}

                                {/* Date Inputs */}
                                <View style={s.inputRow}>
                                    <View style={[s.inputGroup, { flex: 1, marginBottom: 0 }]}>
                                        <Text style={[s.label, { color: subtextColor }]}>
                                            {type === 'LEAVE' ? 'Start Date *' : 'Date *'}
                                        </Text>
                                        <TouchableOpacity
                                            style={[s.input, { backgroundColor: inputBg, borderColor: inputBorder, justifyContent: 'center' }]}
                                            onPress={() => setShowStartDatePicker(true)}
                                        >
                                            <Text style={{ color: startDate ? textColor : subtextColor, fontWeight: '500' }}>
                                                {startDate ? formatDate(startDate) : 'Select Date'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    {type === 'LEAVE' && (
                                        <View style={[s.inputGroup, { flex: 1, marginBottom: 0 }]}>
                                            <Text style={[s.label, { color: subtextColor }]}>End Date *</Text>
                                            <View style={{ position: 'relative' }}>
                                                <TouchableOpacity
                                                    style={[s.input, { backgroundColor: inputBg, borderColor: inputBorder, justifyContent: 'center', paddingRight: endDate ? 36 : 16 }]}
                                                    onPress={() => setShowEndDatePicker(true)}
                                                >
                                                    <Text style={{ color: endDate ? textColor : subtextColor, fontWeight: '500' }} numberOfLines={1}>
                                                        {endDate ? formatDate(endDate) : 'Select Date'}
                                                    </Text>
                                                </TouchableOpacity>
                                                {endDate !== '' && (
                                                    <TouchableOpacity
                                                        style={{ position: 'absolute', right: 12, top: 12, padding: 4 }}
                                                        onPress={() => setEndDate('')}
                                                    >
                                                        <Ionicons name="close-circle" size={16} color={subtextColor} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {showStartDatePicker && (
                                    Platform.OS === 'ios' ? (
                                        <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 8, marginTop: 12 }}>
                                            <DateTimePicker
                                                value={startDate && !isNaN(new Date(startDate).getTime()) ? new Date(startDate) : new Date()}
                                                mode="date"
                                                display="inline"
                                                themeVariant={isDark ? 'dark' : 'light'}
                                                onChange={(event, selectedDate) => {
                                                    if (selectedDate) {
                                                        const formatted = selectedDate.toISOString().split('T')[0];
                                                        setStartDate(formatted);
                                                    }
                                                }}
                                                style={{ alignSelf: 'center' }}
                                            />
                                            <TouchableOpacity
                                                style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20, marginTop: 4, backgroundColor: '#007AFF', borderRadius: 12 }}
                                                onPress={() => setShowStartDatePicker(false)}
                                            >
                                                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Done</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <DateTimePicker
                                            value={startDate && !isNaN(new Date(startDate).getTime()) ? new Date(startDate) : new Date()}
                                            mode="date"
                                            display="default"
                                            onChange={(event, selectedDate) => {
                                                setShowStartDatePicker(false);
                                                if (selectedDate) {
                                                    const formatted = selectedDate.toISOString().split('T')[0];
                                                    setStartDate(formatted);
                                                }
                                            }}
                                        />
                                    )
                                )}

                                {showEndDatePicker && (
                                    Platform.OS === 'ios' ? (
                                        <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 8, marginTop: 12 }}>
                                            <DateTimePicker
                                                value={endDate && !isNaN(new Date(endDate).getTime()) ? new Date(endDate) : new Date()}
                                                mode="date"
                                                display="inline"
                                                themeVariant={isDark ? 'dark' : 'light'}
                                                onChange={(event, selectedDate) => {
                                                    if (selectedDate) {
                                                        const formatted = selectedDate.toISOString().split('T')[0];
                                                        setEndDate(formatted);
                                                    }
                                                }}
                                                style={{ alignSelf: 'center' }}
                                            />
                                            <TouchableOpacity
                                                style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20, marginTop: 4, backgroundColor: '#007AFF', borderRadius: 12 }}
                                                onPress={() => setShowEndDatePicker(false)}
                                            >
                                                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Done</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <DateTimePicker
                                            value={endDate && !isNaN(new Date(endDate).getTime()) ? new Date(endDate) : new Date()}
                                            mode="date"
                                            display="default"
                                            onChange={(event, selectedDate) => {
                                                setShowEndDatePicker(false);
                                                if (selectedDate) {
                                                    const formatted = selectedDate.toISOString().split('T')[0];
                                                    setEndDate(formatted);
                                                }
                                            }}
                                        />
                                    )
                                )}

                                {/* Proof (Reimburse only) */}
                                {type === 'REIMBURSE' && (
                                    <View style={[s.inputGroup, { marginTop: 12 }]}>
                                        <Text style={[s.label, { color: subtextColor }]}>Proof / Receipt (Image or PDF) *</Text>
                                        {proofFiles.map((file, idx) => (
                                            <View
                                                key={`proof-${idx}`}
                                                style={[
                                                    s.input,
                                                    { 
                                                        backgroundColor: inputBg, 
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        flexDirection: 'row',
                                                        marginBottom: 8,
                                                    }
                                                ]}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                                    <Ionicons name="document-attach-outline" size={20} color="#007AFF" />
                                                    <Text style={{ color: textColor, fontSize: 14, fontWeight: '500', flex: 1 }} numberOfLines={1}>
                                                        {file.name}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity onPress={() => removeProofFile(idx)}>
                                                    <Ionicons name="trash" size={18} color="#FF3B30" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                        <TouchableOpacity
                                            style={[
                                                s.input,
                                                { 
                                                    backgroundColor: isDark ? 'rgba(0,122,255,0.08)' : 'rgba(0,122,255,0.04)', 
                                                    borderColor: '#007AFF',
                                                    borderWidth: 1,
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    flexDirection: 'row',
                                                    borderStyle: 'dashed'
                                                }
                                            ]}
                                            onPress={() => setProofPickerVisible(true)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="cloud-upload-outline" size={18} color="#007AFF" style={{ marginRight: 6 }} />
                                            <Text style={{ color: '#007AFF', fontSize: 14, fontWeight: '600' }}>
                                                {proofFiles.length > 0 ? 'Add More Files' : 'Upload Photo / PDF'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Reason Description */}
                                <View style={[s.inputGroup, { marginTop: 12, marginBottom: 0 }]}>
                                    <Text style={[s.label, { color: subtextColor }]}>Reason / Description *</Text>
                                    <TextInput
                                        style={[s.input, s.textArea, { color: textColor, backgroundColor: inputBg }]}
                                        value={reason}
                                        onChangeText={setReason}
                                        multiline
                                        numberOfLines={3}
                                        placeholder="Explain the reason for this request..."
                                        placeholderTextColor={subtextColor}
                                    />
                                </View>
                            </View>

                            {/* Status Selector (Only for Admin editing request or display) */}
                            {request && (
                                <>
                                    <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>APPROVAL STATUS</Text>
                                    <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                        <View style={s.segmentedContainer}>
                                            {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(sStatus => {
                                                const isSelected = status === sStatus;
                                                let activeBg = '#FF9500'; // Orange
                                                if (sStatus === 'APPROVED') activeBg = '#34C759'; // Green
                                                if (sStatus === 'REJECTED') activeBg = '#FF3B30'; // Red

                                                return (
                                                    <TouchableOpacity
                                                        key={sStatus}
                                                        style={[
                                                            s.segmentButton,
                                                            isSelected && { backgroundColor: activeBg }
                                                        ]}
                                                        onPress={() => setStatus(sStatus)}
                                                    >
                                                        <Text style={[s.segmentText, { color: isSelected ? '#FFF' : textColor, fontWeight: isSelected ? '700' : '400' }]}>
                                                            {sStatus}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        {/* Footer Actions */}
                        <View style={s.footer}>
                            <TouchableOpacity
                                style={[s.footerButton, s.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                                onPress={onClose}
                                disabled={submitting}
                            >
                                <Text style={[s.footerBtnText, { color: isDark ? '#FFF' : '#333' }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.footerButton, s.confirmButton, submitting && { opacity: 0.6 }]}
                                onPress={handleSave}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={[s.footerBtnText, { color: '#FFF' }]}>Submit Request</Text>
                                )}
                            </TouchableOpacity>
                        </View>
        </View>
    );

    const proofPickerModal = (
        <Modal
            visible={proofPickerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setProofPickerVisible(false)}
            statusBarTranslucent={true}
        >
            <View style={s.pickerOverlay}>
                <View
                    style={[
                        s.pickerContent,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                        }
                    ]}
                >
                    <Text style={[s.pickerTitle, { color: textColor }]}>Attach Proof</Text>
                    <Text style={[s.pickerSub, { color: subtextColor }]}>Choose a source for your receipt</Text>

                    <View style={s.pickerActions}>
                        <TouchableOpacity
                            style={[s.pickerBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }]}
                            onPress={handlePickLibrary}
                        >
                            <Ionicons name="images-outline" size={18} color="#8B5CF6" style={{ marginRight: 8 }} />
                            <Text style={[s.pickerBtnText, { color: textColor }]}>Photo Library</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.pickerBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }]}
                            onPress={handlePickDocument}
                        >
                            <Ionicons name="document-text-outline" size={18} color="#8B5CF6" style={{ marginRight: 8 }} />
                            <Text style={[s.pickerBtnText, { color: textColor }]}>Files / PDF</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.pickerBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', marginTop: 8 }]}
                            onPress={() => setProofPickerVisible(false)}
                        >
                            <Text style={[s.pickerBtnText, { color: textColor, fontWeight: '700' }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    if (isEmbedded) {
        return (
            <View style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                {content}
                {proofPickerModal}
            </View>
        );
    }

    return (
        <>
            <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose} statusBarTranslucent={true}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <View style={s.overlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={onClose}
                        />
                        {content}
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            {proofPickerModal}
        </>
    );
}

const s = StyleSheet.create({
    embeddedSheet: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: SCREEN_HEIGHT * 0.85,
        width: '100%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '700',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    pickerContainer: {
        marginBottom: 12,
    },
    horizontalScroll: {
        gap: 8,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 9999,
        borderWidth: 1.5,
        gap: 8,
    },
    avatarSmall: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarSmallText: {
        fontSize: 10,
        fontWeight: '800',
    },
    pillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    projectPill: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 9999,
        borderWidth: 1.5,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 18,
        fontSize: 15,
        fontWeight: '500',
    },
    textArea: {
        height: 80,
        paddingTop: 12,
        paddingBottom: 12,
        borderRadius: 20,
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(120, 120, 128, 0.12)',
        borderRadius: 24,
        padding: 2,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
    },
    segmentText: {
        fontSize: 13,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        gap: 12,
    },
    footerButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    cancelButton: {},
    confirmButton: {
        backgroundColor: '#8B5CF6',
    },
    footerBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    pickerContent: {
        width: 320,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
    },
    pickerTitle: {
        fontSize: 19,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 4,
    },
    pickerSub: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 20,
    },
    pickerActions: {
        width: '100%',
        gap: 10,
    },
    pickerBtn: {
        width: '100%',
        height: 48,
        borderRadius: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    dropdownContainer: {
        marginBottom: 8,
    },
    dropdownTrigger: {
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    dropdownTriggerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    dropdownTriggerText: {
        fontSize: 15,
        fontWeight: '600',
    },
    dropdownList: {
        borderRadius: 24,
        borderWidth: 1,
        marginTop: 8,
        overflow: 'hidden',
    },
    dropdownItem: {
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    dropdownItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    dropdownItemText: {
        fontSize: 15,
        fontWeight: '500',
    },
    projectCodeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    projectCodeBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
});
