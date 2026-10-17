import React, { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { 
    Host,
    Form, 
    Section, 
    TextField,
    Button, 
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Picker, 
    DateTimePicker,
    Switch,
    Text as SwiftUIText
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, disabled } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import { CrewRequest, CrewMember, Project, matchProjectCode } from './mockData';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadCrewFileBase64 } from '@/lib/api/attendance';

interface SwiftUICrewRequestSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave: (request: CrewRequest) => void;
    request: CrewRequest | null;
    crewMembers: CrewMember[];
    projects: Project[];
}

export const SwiftUICrewRequestSheet: React.FC<SwiftUICrewRequestSheetProps> = ({
    isOpened,
    onClose,
    onSave,
    request,
    crewMembers,
    projects,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';
    const sheetBg = 'clear';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
    const menuControlModifiers = [tint(isDark ? '#007AFF' : '#1C1C1E')];
    const textFieldModifiers = [tint('#007AFF')];

    // State fields
    const [crewIndex, setCrewIndex] = useState(0);
    const [requestTypeIndex, setRequestTypeIndex] = useState(0); // 0 = LEAVE, 1 = KASBON, 2 = REIMBURSE
    const [projectIndex, setProjectIndex] = useState(0); // 0 = No Project
    const [amount, setAmount] = useState('');
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [hasEndDate, setHasEndDate] = useState(false);
    const [reason, setReason] = useState('');
    const [proofFiles, setProofFiles] = useState<{ name: string; uri: string }[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [statusIndex, setStatusIndex] = useState(0); // 0 = PENDING, 1 = APPROVED, 2 = REJECTED

    const requestTypes = ['LEAVE', 'KASBON', 'REIMBURSE'] as const;
    const statusOptions = ['PENDING', 'APPROVED', 'REJECTED'];

    const filteredCrewMembers = crewMembers.filter(member => {
        const selectedProjCode = projectIndex > 0 ? projects[projectIndex - 1].code : undefined;
        if (!selectedProjCode) {
            return !member.projectCode;
        }
        return matchProjectCode(member.projectCode, selectedProjCode);
    });

    useEffect(() => {
        if (isOpened) {
            if (request) {
                const typeIdx = requestTypes.indexOf(request.type);
                setRequestTypeIndex(typeIdx >= 0 ? typeIdx : 0);

                if (request.projectCode) {
                    const pIdx = projects.findIndex(p => p.code === request.projectCode);
                    setProjectIndex(pIdx >= 0 ? pIdx + 1 : 0);
                    
                    const filtered = crewMembers.filter(c => matchProjectCode(c.projectCode, request.projectCode || ''));
                    const cIdx = filtered.findIndex(c => c.id === request.crewId);
                    setCrewIndex(cIdx >= 0 ? cIdx : 0);
                } else {
                    setProjectIndex(0);
                    
                    const filtered = crewMembers.filter(c => !c.projectCode);
                    const cIdx = filtered.findIndex(c => c.id === request.crewId);
                    setCrewIndex(cIdx >= 0 ? cIdx : 0);
                }

                setAmount(request.amount ? String(request.amount) : '');
                setStartDate(request.startDate ? new Date(request.startDate) : new Date());
                
                if (request.endDate) {
                    setEndDate(new Date(request.endDate));
                    setHasEndDate(true);
                } else {
                    setEndDate(new Date());
                    setHasEndDate(false);
                }

                setReason(request.reason || '');
                if (request.proofUrl) {
                    const urls = request.proofUrl.split(',').filter(Boolean);
                    setProofFiles(urls.map(url => ({
                        name: url.split('/').pop() || 'proof.pdf',
                        uri: url.trim()
                    })));
                } else {
                    setProofFiles([]);
                }

                const sIdx = statusOptions.indexOf(request.status);
                setStatusIndex(sIdx >= 0 ? sIdx : 0);
            } else {
                const defaultProjIdx = projects.length > 0 ? 1 : 0;
                setProjectIndex(defaultProjIdx);
                setCrewIndex(0);
                setRequestTypeIndex(0);
                setAmount('');
                setStartDate(new Date());
                setEndDate(new Date());
                setHasEndDate(false);
                setReason('');
                setProofFiles([]);
                setSubmitting(false);
                setStatusIndex(0);
            }
        }
    }, [request, isOpened, crewMembers, projects]);

    const handlePickProof = () => {
        Alert.alert('Attach Proof', 'Choose a source', [
            {
                text: 'Photo Library',
                onPress: async () => {
                    try {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ['images'],
                            allowsMultipleSelection: true,
                            quality: 0.5,
                        });
                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            const newFiles = result.assets.map(asset => ({
                                name: asset.fileName || asset.uri.split('/').pop() || `image-${Date.now()}`,
                                uri: asset.uri,
                            }));
                            setProofFiles(prev => [...prev, ...newFiles]);
                        }
                    } catch (err) {
                        console.log('ImagePicker Error:', err);
                    }
                },
            },
            {
                text: 'Files / PDF',
                onPress: async () => {
                    try {
                        const result = await DocumentPicker.getDocumentAsync({
                            type: ['image/*', 'application/pdf'],
                            copyToCacheDirectory: true,
                            multiple: true,
                        });
                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            const newFiles = result.assets.map(asset => ({
                                name: asset.name || asset.uri.split('/').pop() || `doc-${Date.now()}`,
                                uri: asset.uri,
                            }));
                            setProofFiles(prev => [...prev, ...newFiles]);
                        }
                    } catch (err) {
                        console.log('DocumentPicker Error:', err);
                    }
                },
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const removeProofFile = (index: number) => {
        setProofFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        const crew = filteredCrewMembers[crewIndex];
        if (!crew) {
            Alert.alert('Error', 'Please select a crew member.');
            return;
        }
        if (!reason.trim()) {
            Alert.alert('Error', 'Please enter a reason or description.');
            return;
        }

        const requestType = requestTypes[requestTypeIndex];
        if ((requestType === 'KASBON' || requestType === 'REIMBURSE') && !amount) {
            Alert.alert('Error', 'Please specify the amount.');
            return;
        }

        if (requestType === 'REIMBURSE' && proofFiles.length === 0) {
            Alert.alert('Error', 'Please upload a proof / receipt file (Image or PDF).');
            return;
        }

        setSubmitting(true);
        try {
            let proofUrl: string | undefined;
            if (requestType === 'REIMBURSE' && proofFiles.length > 0) {
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

            const proj = projectIndex > 0 ? projects[projectIndex - 1] : null;
            const formattedStartDate = startDate.toISOString().split('T')[0];
            const formattedEndDate = (requestType === 'LEAVE' && hasEndDate) ? endDate.toISOString().split('T')[0] : undefined;

            const newRequest: CrewRequest = {
                id: request ? request.id : `r_${Date.now()}`,
                crewId: crew.id,
                crewName: crew.name,
                crewRole: crew.role,
                projectCode: proj ? proj.code : undefined,
                type: requestType,
                amount: (requestType === 'KASBON' || requestType === 'REIMBURSE') ? (Number(amount) || 0) : undefined,
                startDate: formattedStartDate,
                endDate: formattedEndDate,
                reason: reason.trim(),
                status: request ? (statusOptions[statusIndex] as any) : 'PENDING',
                createdAt: request ? request.createdAt : new Date().toISOString(),
                proofUrl,
            };

            onSave(newRequest);
        } catch (err: any) {
            Alert.alert('Upload Error', err.message || 'Failed to upload proof files.');
        } finally {
            setSubmitting(false);
        }
    };

    const crewOptions = filteredCrewMembers.map(c => c.name);
    const projectOptions = ['No Project', ...projects.map(p => p.code)];
    const requestType = requestTypes[requestTypeIndex];

    const sheetTitle = 'Crew Request';

    const getStatusColor = (idx: number) => {
        if (idx === 0) return '#FF9500'; // PENDING - Orange
        if (idx === 1) return '#34C759'; // APPROVED - Green
        return '#FF3B30'; // REJECTED - Red
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet 
                isOpened={isOpened}
                presentationDetents={[0.85]}
                onIsOpenedChange={(opened) => {
                    if (!opened) {
                        onClose();
                    }
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background(sheetBg)
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {sheetTitle}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Scrollable Form */}
                    <Form modifiers={[background(sheetBg)]}>
                        <Section title="Project & Crew Selection">
                            <Picker
                                label="Project Code"
                                options={projectOptions}
                                selectedIndex={projectIndex}
                                onOptionSelected={(e) => {
                                    setProjectIndex(e.nativeEvent.index);
                                    setCrewIndex(0);
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={[
                                    tint(isDark ? '#AF52DE' : '#1C1C1E'),
                                    disabled(!!request)
                                ]}
                            />
                            <Picker
                                label="Crew Member"
                                options={crewOptions}
                                selectedIndex={crewIndex}
                                onOptionSelected={(e) => setCrewIndex(e.nativeEvent.index)}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={[
                                    tint(isDark ? '#AF52DE' : '#1C1C1E'),
                                    disabled(!!request)
                                ]}
                            />
                        </Section>

                        <Section title="Request Type">
                            <Picker
                                options={['Leave', 'Cash Advance', 'Reimburse']}
                                selectedIndex={requestTypeIndex}
                                onOptionSelected={(e) => setRequestTypeIndex(e.nativeEvent.index)}
                                variant="segmented"
                                modifiers={[
                                    tint('#AF52DE')
                                ]}
                            />
                        </Section>

                        <Section title="Request Details">

                            {(requestType === 'KASBON' || requestType === 'REIMBURSE') && (
                                <TextField
                                    placeholder="Amount (Rp) *"
                                    defaultValue={amount}
                                    onChangeText={(v) => {
                                        const clean = v.replace(/[^0-9]/g, '');
                                        setAmount(clean);
                                    }}
                                    keyboardType="numeric"
                                    modifiers={textFieldModifiers}
                                />
                            )}

                            <DateTimePicker
                                title={requestType === 'LEAVE' ? 'Start Date' : 'Date'}
                                initialDate={startDate.toISOString()}
                                onDateSelected={(date) => setStartDate(date)}
                                variant="compact"
                                displayedComponents="date"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />

                            {requestType === 'LEAVE' && (
                                <VStack spacing={8} alignment="leading" modifiers={[padding({ vertical: 4 })]}>
                                    <Switch
                                        label="Set End Date"
                                        value={hasEndDate}
                                        onValueChange={setHasEndDate}
                                        color="#007AFF"
                                    />
                                    {hasEndDate && (
                                        <DateTimePicker
                                            title="End Date"
                                            initialDate={endDate.toISOString()}
                                            onDateSelected={(date) => setEndDate(date)}
                                            variant="compact"
                                            displayedComponents="date"
                                            color={nativeControlTextColor}
                                            modifiers={menuControlModifiers}
                                        />
                                    )}
                                </VStack>
                            )}

                            <TextField
                                placeholder="Reason / Description *"
                                defaultValue={reason}
                                onChangeText={setReason}
                                modifiers={textFieldModifiers}
                            />

                            {requestType === 'REIMBURSE' && (
                                <VStack spacing={8} alignment="leading" modifiers={[padding({ vertical: 4 })]}>
                                    <SwiftUIText size={13} color={subtextColor}>Proof / Receipt (Image or PDF) *</SwiftUIText>
                                    {proofFiles.map((file, idx) => (
                                        <HStack key={`proof-${idx}`} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                            <SwiftUIText size={14} color={textColor}>
                                                {file.name}
                                            </SwiftUIText>
                                            <Spacer />
                                            <Button
                                                systemImage="trash.fill"
                                                color="red"
                                                onPress={() => removeProofFile(idx)}
                                            />
                                        </HStack>
                                    ))}
                                    <Button
                                        variant="glass"
                                        onPress={handlePickProof}
                                        modifiers={[cornerRadius(999)]}
                                    >
                                        <HStack modifiers={[frame({ height: 44 })]}>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" size={16} color="#AF52DE">
                                                {proofFiles.length > 0 ? 'Add More Files' : 'Upload Photo / PDF'}
                                            </SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                    </Button>
                                </VStack>
                            )}
                        </Section>

                        {request && (
                            <Section title="Approval Status">
                                <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                    <SwiftUIText size={13} color={subtextColor}>Status</SwiftUIText>
                                    <Picker
                                        options={statusOptions}
                                        selectedIndex={statusIndex}
                                        onOptionSelected={(e) => setStatusIndex(e.nativeEvent.index)}
                                        variant="segmented"
                                        modifiers={[
                                            tint(getStatusColor(statusIndex))
                                        ]}
                                    />
                                </VStack>
                            </Section>
                        )}
                    </Form>

                    {/* Footer buttons */}
                    <VStack spacing={12} modifiers={[
                        background(sheetBg),
                        padding({ top: 12, leading: 20, trailing: 20, bottom: Platform.OS === 'ios' ? 36 : 24 }),
                        frame({ maxWidth: Infinity })
                    ]}>
                        <HStack spacing={12}>
                            <Button
                                variant="glass"
                                color="gray"
                                onPress={onClose}
                                modifiers={[
                                    frame({ width: 100 }),
                                    cornerRadius(999)
                                ]}
                            >
                                <HStack modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 44 })
                                ]}>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" size={17}>Cancel</SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                            <Button
                                variant="borderedProminent"
                                color="#007AFF"
                                onPress={handleSave}
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    cornerRadius(999)
                                ]}
                            >
                                <HStack modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 44 })
                                ]}>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                        Submit Request
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        </HStack>
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
