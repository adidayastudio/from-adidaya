import React, { useState, useEffect } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    Platform,
    Linking,
    Image,
    Dimensions,
    Clipboard,
    ActivityIndicator,
    TextInput,
    Switch,
    Alert,
    UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from '../ui/GlassView';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { SwiftUIImagePreviewSheet } from './SwiftUIImagePreviewSheet';
import { 
    CrewMember, 
    CrewDocument, 
    DocumentType, 
    Assignment, 
    Project, 
    CrewRole, 
    CrewStatus, 
    CREW_ROLE_OPTIONS, 
    CREW_ROLE_LABELS, 
    DOCUMENT_TYPE_LABELS,
    DOCUMENT_TYPE_OPTIONS,
    generateCrewId,
    matchProjectCode,
} from './mockData';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadCrewFileBase64 } from '@/lib/api/attendance';
import { PlatformIcon } from '../ui/PlatformIcon';

// Safe lazy loading of expo-print and expo-sharing
let Print: any = null;
let Sharing: any = null;
try {
    Print = require('expo-print');
    Sharing = require('expo-sharing');
} catch (e) {
    // handled
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Safe lazy loading of react-native-webview
let WebView: any = null;
let isWebViewAvailable = false;
try {
    const { WebView: WV } = require('react-native-webview');
    WebView = WV;
    isWebViewAvailable = !!UIManager.getViewManagerConfig('RNCWebView');
} catch (e) {
    // handled
}

const DEFAULT_RATES_BY_ROLE: Record<CrewRole, { base: number; overtime: number; ot1: number; ot2: number; ot3: number }> = {
    FOREMAN: { base: 350000, overtime: 450000, ot1: 60000, ot2: 80000, ot3: 100000 },
    LEADER: { base: 280000, overtime: 360000, ot1: 50000, ot2: 70000, ot3: 90000 },
    SKILLED: { base: 220000, overtime: 300000, ot1: 40000, ot2: 55000, ot3: 70000 },
    OPERATOR: { base: 300000, overtime: 400000, ot1: 55000, ot2: 75000, ot3: 95000 },
    HELPER: { base: 150000, overtime: 200000, ot1: 25000, ot2: 35000, ot3: 45000 },
    GENERAL: { base: 140000, overtime: 180000, ot1: 20000, ot2: 30000, ot3: 40000 }
};

interface CrewDetailModalProps {
    visible: boolean;
    onClose: () => void;
    member: CrewMember | null;
    onEdit?: (member: CrewMember) => void;
    onSave?: (member: CrewMember) => void;
    onDelete?: (id: string) => void;
    assignments?: Assignment[];
    projects?: Project[];
    crewMembers?: CrewMember[];
    onViewImage?: (imageUrl: string, title: string) => void;
    onViewDocument?: (html: string, title: string) => void;
    isEmbedded?: boolean;
}

export function CrewDetailModal({
    visible,
    onClose,
    member,
    onEdit,
    onSave,
    onDelete,
    assignments = [],
    projects = [],
    crewMembers = [],
    onViewImage,
    onViewDocument,
    isEmbedded = false,
}: CrewDetailModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const tintColor = Colors[resolvedTheme].tint;

    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Document / HTML Preview
    const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);
    const [activeDocHtml, setActiveDocHtml] = useState<string | null>(null);
    const [activeDocTitle, setActiveDocTitle] = useState<string>('');

    // Form inputs state
    const [name, setName] = useState('');
    const [nickname, setNickname] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [nik, setNik] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [homeAddress, setHomeAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    
    // Role & Status pickers state
    const [roleIndex, setRoleIndex] = useState(2); // SKILLED default
    const [statusIndex, setStatusIndex] = useState(0); // ACTIVE default
    const [skillTagsText, setSkillTagsText] = useState('');

    const [bankName, setBankName] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankAccountName, setBankAccountName] = useState('');
    const [documents, setDocuments] = useState<CrewDocument[]>([]);

    // Rates editable state
    const [baseRate, setBaseRate] = useState('220000');
    const [overtimeRate, setOvertimeRate] = useState('300000');
    const [otRate1, setOtRate1] = useState('40000');
    const [otRate2, setOtRate2] = useState('55000');
    const [otRate3, setOtRate3] = useState('70000');
    const [isManualOverride, setIsManualOverride] = useState(false);

    // Custom Picker Modal State (for Android / general fallbacks)
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerTitle, setPickerTitle] = useState('');
    const [pickerOptions, setPickerOptions] = useState<{ label: string; value?: any; onPress?: () => void }[]>([]);
    const [onPickerSelect, setOnPickerSelect] = useState<(value: any) => void>(() => () => {});

    useEffect(() => {
        if (visible && member) {
            setName(member.name || '');
            setNickname(member.nickname || '');
            setPhotoUrl(member.photoUrl || '');
            setNik(member.nik || '');
            setBirthDate(member.birthDate || '');
            setHomeAddress(member.homeAddress || '');
            setPhone(member.phone || '');
            setEmail(member.email || '');
            
            const rIdx = CREW_ROLE_OPTIONS.findIndex(opt => opt.value === member.role);
            setRoleIndex(rIdx >= 0 ? rIdx : 2);
            setStatusIndex(member.status === 'ACTIVE' ? 0 : 1);
            setSkillTagsText((member.skillTags || []).join(', '));

            setBankName(member.bankName || '');
            setBankAccountNumber(member.bankAccountNumber || '');
            setBankAccountName(member.bankAccountName || '');
            setDocuments(member.documents || []);

            setBaseRate(String(member.baseDailyRate || 0));
            setOvertimeRate(String(member.overtimeDailyRate || 0));
            setOtRate1(String(member.otRate1 || 0));
            setOtRate2(String(member.otRate2 || 0));
            setOtRate3(String(member.otRate3 || 0));

            const defaults = DEFAULT_RATES_BY_ROLE[member.role || 'SKILLED'];
            const custom = defaults ? (
                member.baseDailyRate !== defaults.base ||
                member.overtimeDailyRate !== defaults.overtime ||
                member.otRate1 !== defaults.ot1 ||
                member.otRate2 !== defaults.ot2 ||
                member.otRate3 !== defaults.ot3
            ) : false;
            setIsManualOverride(custom);

            setIsEditing(false);
            setSaving(false);
            setActiveDocUrl(null);
            setActiveDocHtml(null);
        }
    }, [member, visible]);

    if (!member) return null;

    const crewId = generateCrewId(member, crewMembers, assignments);
    const currentProject = projects.find(p => p.code === member.projectCode);
    const projectName = currentProject ? `${currentProject.code} - ${currentProject.name}` : member.projectCode;

    const handleRoleChange = (index: number) => {
        setRoleIndex(index);
        if (!isManualOverride) {
            const selectedRole = CREW_ROLE_OPTIONS[index]?.value;
            if (selectedRole && DEFAULT_RATES_BY_ROLE[selectedRole]) {
                const defaults = DEFAULT_RATES_BY_ROLE[selectedRole];
                setBaseRate(String(defaults.base));
                setOvertimeRate(String(defaults.overtime));
                setOtRate1(String(defaults.ot1));
                setOtRate2(String(defaults.ot2));
                setOtRate3(String(defaults.ot3));
            }
        }
    };

    const handleToggleOverride = (val: boolean) => {
        setIsManualOverride(val);
        if (!val) {
            const selectedRole = CREW_ROLE_OPTIONS[roleIndex]?.value || 'SKILLED';
            const defaults = DEFAULT_RATES_BY_ROLE[selectedRole];
            if (defaults) {
                setBaseRate(String(defaults.base));
                setOvertimeRate(String(defaults.overtime));
                setOtRate1(String(defaults.ot1));
                setOtRate2(String(defaults.ot2));
                setOtRate3(String(defaults.ot3));
            }
        }
    };

    const handleRolePress = () => {
        if (Platform.OS === 'ios') {
            Alert.alert(
                'Select Role',
                'Choose a role for the crew member:',
                CREW_ROLE_OPTIONS.map((opt, index) => ({
                    text: opt.label,
                    onPress: () => handleRoleChange(index)
                })),
                { cancelable: true }
            );
        } else {
            setPickerTitle('Select Role');
            setPickerOptions(CREW_ROLE_OPTIONS.map((opt, index) => ({ label: opt.label, value: index })));
            setOnPickerSelect(() => (val: number) => handleRoleChange(val));
            setPickerVisible(true);
        }
    };

    const handlePickAvatar = async () => {
        if (!isEditing) return;
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.5,
            });
            if (!result.canceled && result.assets?.[0]) {
                const asset = result.assets[0];
                setPhotoUrl(asset.uri);
            }
        } catch (err) {
            console.log('Avatar ImagePicker Error:', err);
        }
    };

    const handleDeleteMember = () => {
        Alert.alert(
            'Delete Crew Member',
            `Are you sure you want to delete ${member?.name}? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        if (member) {
                            onDelete?.(member.id);
                            onClose();
                        }
                    }
                }
            ]
        );
    };

    const handleCall = () => {
        if (member.phone) Linking.openURL(`tel:${member.phone}`);
    };

    const handleEmail = () => {
        if (member.email) Linking.openURL(`mailto:${member.email}`);
    };

    const formatCurrency = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

    const copyToClipboard = (text: string, label: string) => {
        if (!text) return;
        Clipboard.setString(text);
        Alert.alert('Copied', `${label} copied to clipboard`);
    };

    const memberAssignments = [...(assignments || []).filter(a => a.crewId === member.id)];
    if (member.projectCode && !memberAssignments.some(a => matchProjectCode(a.projectCode, member.projectCode) && a.status === 'ACTIVE')) {
        memberAssignments.unshift({
            id: `virtual_active_${member.id}`,
            crewId: member.id,
            crewName: member.name,
            crewRole: member.role,
            projectCode: member.projectCode,
            startDate: 'Ongoing',
            status: 'ACTIVE',
        });
    }

    const getAssignmentStatusColor = (status: string) => {
        if (status === 'ACTIVE') return '#34C759'; // Consistent Green
        if (status === 'COMPLETED') return '#8E8E93'; // Consistent Grey
        return '#FF9500'; // Consistent Orange
    };

    const handleAddDocument = () => {
        const typeOptions = Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({
            label,
            value,
            onPress: () => pickDocumentFile(value as DocumentType, label),
        }));
        if (Platform.OS === 'ios') {
            Alert.alert('Document Type', 'Choose the document type', [
                ...typeOptions.map(opt => ({ text: opt.label, onPress: opt.onPress })),
                { text: 'Cancel', style: 'cancel' },
            ]);
        } else {
            setPickerTitle('Document Type');
            setPickerOptions(typeOptions);
            setOnPickerSelect(() => (val: any) => {});
            setPickerVisible(true);
        }
    };

    const pickDocumentFile = (docType: DocumentType, label: string) => {
        const pickFromLibrary = async () => {
            try {
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    quality: 0.5,
                });
                if (!result.canceled && result.assets?.[0]) {
                    const asset = result.assets[0];
                    setDocuments(prev => [...prev, {
                        id: `doc_${Date.now()}`,
                        type: docType,
                        label,
                        fileUrl: asset.uri,
                        fileName: asset.fileName || `${label}_${Date.now()}.jpg`,
                    }]);
                }
            } catch (err) {
                console.log('ImagePicker Error:', err);
            }
        };

        const pickFromFile = async () => {
            try {
                const result = await DocumentPicker.getDocumentAsync({
                    type: ['image/*', 'application/pdf'],
                    copyToCacheDirectory: true,
                });
                if (!result.canceled && result.assets?.[0]) {
                    const asset = result.assets[0];
                    setDocuments(prev => [...prev, {
                        id: `doc_${Date.now()}`,
                        type: docType,
                        label,
                        fileUrl: asset.uri,
                        fileName: asset.name || `${label}_${Date.now()}.pdf`,
                    }]);
                }
            } catch (err) {
                console.log('DocumentPicker Error:', err);
            }
        };

        if (Platform.OS === 'ios') {
            Alert.alert('Attach File', 'Choose a source', [
                { text: 'Photo Library', onPress: pickFromLibrary },
                { text: 'Files / PDF', onPress: pickFromFile },
                { text: 'Cancel', style: 'cancel' },
            ]);
        } else {
            setPickerTitle('Attach File');
            setPickerOptions([
                { label: 'Photo Library', onPress: pickFromLibrary },
                { label: 'Files / PDF', onPress: pickFromFile },
            ]);
            setOnPickerSelect(() => (val: any) => {});
            setPickerVisible(true);
        }
    };

    const removeDocument = (docId: string) => {
        setDocuments(prev => prev.filter(d => d.id !== docId));
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Full name is required.');
            return;
        }

        setSaving(true);
        try {
            // Upload new profile picture if local
            let uploadedPhotoUrl = photoUrl;
            if (photoUrl && !photoUrl.startsWith('http')) {
                const base64 = await FileSystem.readAsStringAsync(photoUrl, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                const ext = photoUrl.split('.').pop() || 'jpg';
                uploadedPhotoUrl = await uploadCrewFileBase64(base64, ext, 'image/jpeg');
            }

            // Upload new local documents to Supabase
            const uploadedDocs: CrewDocument[] = [];
            for (const doc of documents) {
                if (doc.fileUrl.startsWith('http')) {
                    uploadedDocs.push(doc);
                } else {
                    const base64 = await FileSystem.readAsStringAsync(doc.fileUrl, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    const ext = doc.fileName.split('.').pop() || 'jpg';
                    const mimeType = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
                    const url = await uploadCrewFileBase64(base64, ext, mimeType);
                    uploadedDocs.push({ ...doc, fileUrl: url });
                }
            }

            const initials = name.trim().split(' ')
                .map(w => w[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase();

            const role = CREW_ROLE_OPTIONS[roleIndex]?.value || 'SKILLED';
            const status = statusIndex === 0 ? 'ACTIVE' : 'INACTIVE';
            const skillTags = skillTagsText.split(',').map(s => s.trim()).filter(Boolean);

            const updated: CrewMember = {
                ...member,
                name: name.trim(),
                initials,
                role,
                status,
                skillTags,
                photoUrl: uploadedPhotoUrl || undefined,
                nickname: nickname.trim() || undefined,
                nik: nik.trim() || undefined,
                birthDate: birthDate.trim() || undefined,
                homeAddress: homeAddress.trim() || undefined,
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
                bankName: bankName.trim() || undefined,
                bankAccountNumber: bankAccountNumber.trim() || undefined,
                bankAccountName: bankAccountName.trim() || undefined,
                baseDailyRate: Number(baseRate) || 0,
                overtimeDailyRate: Number(overtimeRate) || 0,
                otRate1: Number(otRate1) || 0,
                otRate2: Number(otRate2) || 0,
                otRate3: Number(otRate3) || 0,
                documents: uploadedDocs,
            };

            onSave?.(updated);
            setIsEditing(false);
        } catch (err: any) {
            Alert.alert('Upload Error', err.message || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const generateProfileHtml = () => {
        const roleLabel = CREW_ROLE_OPTIONS[roleIndex]?.label || member.role;
        
        const docsHtml = documents.map(doc => {
            const isPdf = doc.fileUrl.toLowerCase().includes('.pdf');
            return `
                <div class="doc-block">
                    <div class="doc-title">${doc.label} (${doc.fileName})</div>
                    ${isPdf 
                        ? `<div class="pdf-placeholder">PDF Document attached: ${doc.fileName}</div>`
                        : `<img src="${doc.fileUrl}" class="doc-img" />`
                    }
                </div>
            `;
        }).join('');

        return `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        body {
                            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                            padding: 30px;
                            color: #1C1C1E;
                            background-color: #FFFFFF;
                        }
                        .header {
                            border-bottom: 2px solid #007AFF;
                            padding-bottom: 20px;
                            margin-bottom: 30px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 24px;
                            color: #007AFF;
                            font-weight: 800;
                            letter-spacing: -0.5px;
                        }
                        .header .title-tag {
                            font-size: 12px;
                            font-weight: 700;
                            text-transform: uppercase;
                            background: rgba(175, 82, 222, 0.1);
                            color: #007AFF;
                            padding: 6px 12px;
                            border-radius: 12px;
                        }
                        .section {
                            margin-bottom: 25px;
                        }
                        .section-title {
                            font-size: 12px;
                            font-weight: 800;
                            color: #8E8E93;
                            letter-spacing: 1px;
                            text-transform: uppercase;
                            margin-bottom: 12px;
                            border-bottom: 1px solid #E5E5EA;
                            padding-bottom: 6px;
                        }
                        .info-grid {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 15px;
                        }
                        .info-item {
                            margin-bottom: 10px;
                        }
                        .info-item.full-width {
                            grid-column: span 2;
                        }
                        .info-label {
                            font-size: 11px;
                            color: #8E8E93;
                            margin-bottom: 4px;
                            font-weight: 600;
                        }
                        .info-value {
                            font-size: 14px;
                            font-weight: 700;
                            color: #1C1C1E;
                        }
                        .skills-container {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 6px;
                            margin-top: 5px;
                        }
                        .skill-badge {
                            font-size: 11px;
                            background: #F2F2F7;
                            padding: 5px 10px;
                            border-radius: 8px;
                            font-weight: 600;
                        }
                        .doc-block {
                            margin-bottom: 25px;
                            text-align: center;
                        }
                        .doc-title {
                            font-size: 14px;
                            font-weight: 700;
                            text-align: left;
                            margin-bottom: 8px;
                            color: #1C1C1E;
                        }
                        .doc-img {
                            max-width: 100%;
                            max-height: 500px;
                            border-radius: 8px;
                            border: 1px solid #E5E5EA;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                        }
                        .pdf-placeholder {
                            padding: 20px;
                            background: #F2F2F7;
                            border-radius: 8px;
                            font-size: 12px;
                            color: #8E8E93;
                            border: 1px dashed #D1D1D6;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>ADIDAYA CREW PROFILE</h1>
                        <div class="title-tag">${roleLabel}</div>
                    </div>
                    <div class="section">
                        <div class="section-title">General Information</div>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">Full Name</div>
                                <div class="info-value">${name}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Nickname</div>
                                <div class="info-value">${nickname || '-'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">NIK</div>
                                <div class="info-value">${nik || '-'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Birth Date</div>
                                <div class="info-value">${birthDate || '-'}</div>
                            </div>
                            <div class="info-item full-width">
                                <div class="info-label">Home Address</div>
                                <div class="info-value">${homeAddress || '-'}</div>
                            </div>
                        </div>
                    </div>
                    <div class="section">
                        <div class="section-title">Contact & Professional</div>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">Phone Number</div>
                                <div class="info-value">${phone || '-'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Email Address</div>
                                <div class="info-value">${email || '-'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Status</div>
                                <div class="info-value" style="color: ${statusIndex === 0 ? '#34C759' : '#FF3B30'};">${statusIndex === 0 ? 'ACTIVE' : 'INACTIVE'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Current Project</div>
                                <div class="info-value">${projectName || 'Unassigned'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Crew ID</div>
                                <div class="info-value">${crewId}</div>
                            </div>
                            <div class="info-item full-width">
                                <div class="info-label">Skill Tags</div>
                                <div class="skills-container">
                                    ${skillTagsText 
                                        ? skillTagsText.split(',').map(tag => `<span class="skill-badge">${tag.trim()}</span>`).join('') 
                                        : '<span class="skill-badge">None</span>'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="section">
                        <div class="section-title">Payroll Accounts</div>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">Bank Name</div>
                                <div class="info-value">${bankName || '-'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Bank Account Number</div>
                                <div class="info-value">${bankAccountNumber || '-'}</div>
                            </div>
                            <div class="info-item full-width">
                                <div class="info-label">Bank Account Name</div>
                                <div class="info-value">${bankAccountName || '-'}</div>
                            </div>
                        </div>
                    </div>
                    ${documents.length > 0 ? `
                        <div class="section" style="page-break-before: always; margin-top: 30px;">
                            <div class="section-title">Attached Documents</div>
                            ${docsHtml}
                        </div>
                    ` : ''}
                </body>
            </html>
        `;
    };

    const handleViewDocument = () => {
        const html = generateProfileHtml();
        setActiveDocHtml(html);
        setActiveDocTitle(`${name.replace(/\s+/g, '_')}_Profile`);
    };

    const handleExportPDF = async () => {
        if (!member) return;
        if (!Print || !Sharing) {
            Alert.alert('Error', 'PDF export is not supported on this build.');
            return;
        }
        try {
            const htmlContent = generateProfileHtml();
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            const cleanName = member.name.replace(/\s+/g, '_');
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            const filename = `Crew_Profile_${cleanName}_${dateStr}.pdf`;
            const customUri = `${FileSystem.cacheDirectory}${filename}`;
            
            await FileSystem.copyAsync({ from: uri, to: customUri });
            await Sharing.shareAsync(customUri, { mimeType: 'application/pdf', dialogTitle: `Profile_${cleanName}` });
        } catch (error) {
            console.error('Error exporting PDF:', error);
            Alert.alert('Error', 'Failed to export crew member data as PDF.');
        }
    };

    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#FFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
    const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    const bodyContent = (
        <View style={isEmbedded ? [s.embeddedSheet, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }] : { flex: 1 }}>
            {/* Header */}
            <View style={[s.header, isEmbedded && { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <Text style={[s.headerTitle, { color: textColor }]}>
                    {isEditing ? 'Edit Details' : (isEditing ? name : member.name)}
                </Text>
                <TouchableOpacity
                    style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                    onPress={onClose}
                >
                    <PlatformIcon name="xmark" size={16} tintColor={subtextColor} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[s.content, isEmbedded && { paddingHorizontal: 24, paddingBottom: 60, maxWidth: 840, width: '100%', alignSelf: 'center' }]} showsVerticalScrollIndicator={false}>
                {/* Profile Card / Avatar */}
                <View style={s.profileContainer}>
                    <TouchableOpacity 
                        style={[s.avatar, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.18)' : 'rgba(139, 92, 246, 0.1)' }]}
                        onPress={handlePickAvatar}
                        activeOpacity={isEditing ? 0.7 : 1}
                    >
                        {photoUrl ? (
                            <Image
                                source={{ uri: photoUrl }}
                                style={s.avatarImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <Text style={[s.avatarText, { color: '#8B5CF6' }]}>{member.initials}</Text>
                        )}
                    </TouchableOpacity>
                    {isEditing && (
                        <Text style={[s.avatarHelperText, { color: '#8B5CF6' }]}>Tap avatar to change photo</Text>
                    )}
                </View>

                            {/* Section 0: Employment Information (Both View & Edit Mode) */}
                            <View style={s.section}>
                                <Text style={[s.sectionTitle, { color: subtextColor }]}>EMPLOYMENT INFORMATION</Text>
                                <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                    {isEditing ? (
                                        <View style={s.editContainer}>
                                            <TouchableOpacity style={s.pickerTrigger} onPress={handleRolePress}>
                                                <View style={s.infoTextContainer}>
                                                    <Text style={[s.infoLabel, { color: subtextColor }]}>Role</Text>
                                                    <Text style={[s.infoValue, { color: textColor }]}>
                                                        {CREW_ROLE_OPTIONS[roleIndex]?.label || 'Select Role'}
                                                    </Text>
                                                </View>
                                                <Ionicons name="chevron-down" size={18} color={subtextColor} />
                                            </TouchableOpacity>

                                            <View style={[s.divider, { backgroundColor: cardBorder }]} />

                                            <View style={s.toggleContainer}>
                                                <Text style={[s.infoLabel, { color: subtextColor, marginBottom: 6 }]}>Status</Text>
                                                <View style={s.toggleRow}>
                                                    {(['ACTIVE', 'INACTIVE'] as const).map((sStatus, index) => {
                                                        const isActive = statusIndex === index;
                                                        let actColor = sStatus === 'ACTIVE' ? '#34C759' : '#FF3B30';
                                                        return (
                                                            <TouchableOpacity
                                                                key={sStatus}
                                                                style={[
                                                                    s.toggleBtn,
                                                                    { borderColor: inputBorder },
                                                                    isActive && { backgroundColor: actColor, borderColor: actColor }
                                                                ]}
                                                                onPress={() => setStatusIndex(index)}
                                                            >
                                                                <Text style={[s.toggleText, isActive ? s.toggleTextActive : { color: textColor }]}>
                                                                    {sStatus}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </View>
                                        </View>
                                    ) : (
                                        <>
                                            <View style={s.infoRowPlain}>
                                                <View style={s.infoTextContainer}>
                                                    <Text style={s.infoLabel}>Role</Text>
                                                    <Text style={[s.infoValue, { color: textColor }]}>
                                                        {CREW_ROLE_LABELS[member.role] || member.role}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={[s.divider, { backgroundColor: cardBorder }]} />
                                            <View style={s.infoRowPlain}>
                                                <View style={s.infoTextContainer}>
                                                    <Text style={s.infoLabel}>Status</Text>
                                                    <Text style={[s.infoValue, { color: member.status === 'ACTIVE' ? '#34C759' : '#FF3B30', fontWeight: '700' }]}>
                                                        {member.status}
                                                    </Text>
                                                </View>
                                            </View>
                                            {member.projectCode && (
                                                <>
                                                    <View style={[s.divider, { backgroundColor: cardBorder }]} />
                                                    <View style={s.infoRowPlain}>
                                                        <View style={s.infoTextContainer}>
                                                            <Text style={s.infoLabel}>Current Project</Text>
                                                            <Text style={[s.infoValue, { color: textColor }]}>
                                                                {projectName}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </>
                                            )}
                                            <View style={[s.divider, { backgroundColor: cardBorder }]} />
                                            <View style={s.infoRowPlain}>
                                                <View style={s.infoTextContainer}>
                                                    <Text style={s.infoLabel}>Crew ID</Text>
                                                    <Text style={[s.infoValue, { color: textColor, fontWeight: '700' }]}>
                                                        {crewId}
                                                    </Text>
                                                </View>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>

                            {/* Section 1: Personal Information */}
                            <View style={s.section}>
                                <Text style={[s.sectionTitle, { color: subtextColor }]}>PERSONAL INFORMATION</Text>
                                <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                    {isEditing ? (
                                        <View style={s.editContainer}>
                                            <View style={s.inputGroup}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Full Name *</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                                                    value={name}
                                                    onChangeText={setName}
                                                    placeholder="Full Name"
                                                    placeholderTextColor={subtextColor}
                                                />
                                            </View>
                                            <View style={s.inputGroup}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Nickname</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                                                    value={nickname}
                                                    onChangeText={setNickname}
                                                    placeholder="Nickname"
                                                    placeholderTextColor={subtextColor}
                                                />
                                            </View>
                                            <View style={s.inputGroup}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>NIK (16 digits)</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                                                    value={nik}
                                                    onChangeText={(v) => setNik(v.replace(/[^0-9]/g, ''))}
                                                    keyboardType="numeric"
                                                    maxLength={16}
                                                    placeholder="3175..."
                                                    placeholderTextColor={subtextColor}
                                                />
                                            </View>
                                            <View style={s.inputGroup}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Birth Date (YYYY-MM-DD)</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                                                    value={birthDate}
                                                    onChangeText={setBirthDate}
                                                    placeholder="1985-03-15"
                                                    placeholderTextColor={subtextColor}
                                                />
                                            </View>
                                            <View style={[s.inputGroup, { marginBottom: 0 }]}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Home Address</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder, height: 60, textAlignVertical: 'top' }]}
                                                    value={homeAddress}
                                                    onChangeText={setHomeAddress}
                                                    placeholder="Jl. Raya..."
                                                    placeholderTextColor={subtextColor}
                                                    multiline
                                                />
                                            </View>
                                        </View>
                                    ) : (
                                        <>
                                            <View style={s.infoRowPlain}>
                                                <View style={s.infoTextContainer}>
                                                    <Text style={s.infoLabel}>Full Name</Text>
                                                    <Text style={[s.infoValue, { color: textColor, fontWeight: '700' }]}>{member.name}</Text>
                                                </View>
                                            </View>
                                            <View style={[s.divider, { backgroundColor: cardBorder }]} />
                                            <View style={s.infoRowPlain}>
                                                <View style={s.infoTextContainer}>
                                                    <Text style={s.infoLabel}>Nickname</Text>
                                                    <Text style={[s.infoValue, { color: textColor }]}>{member.nickname || '-'}</Text>
                                                </View>
                                            </View>
                                            <View style={[s.divider, { backgroundColor: cardBorder }]} />
                                            <View style={s.infoRowCopy}>
                                                <View style={s.infoTextContainer}>
                                                    <Text style={s.infoLabel}>NIK</Text>
                                                    <Text style={[s.infoValue, { color: textColor }]}>{member.nik || '-'}</Text>
                                                </View>
                                                {member.nik ? (
                                                    <TouchableOpacity onPress={() => copyToClipboard(member.nik || '', 'NIK')} style={{ padding: 4 }}>
                                                        <PlatformIcon name="doc.on.doc" size={16} tintColor={subtextColor} />
                                                    </TouchableOpacity>
                                                ) : null}
                                            </View>
                                            <View style={[s.divider, { backgroundColor: cardBorder }]} />
                                            <View style={s.infoRowPlain}>
                                                <View style={s.infoTextContainer}>
                                                    <Text style={s.infoLabel}>Birth Date</Text>
                                                    <Text style={[s.infoValue, { color: textColor }]}>{member.birthDate || '-'}</Text>
                                                </View>
                                            </View>
                                            <View style={[s.divider, { backgroundColor: cardBorder }]} />
                                            <View style={s.infoRowPlain}>
                                                <View style={s.infoTextContainer}>
                                                    <Text style={s.infoLabel}>Home Address</Text>
                                                    <Text style={[s.infoValue, { color: textColor }]}>{member.homeAddress || '-'}</Text>
                                                </View>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>

                            {/* Section 2: Contact Information */}
                            <View style={s.section}>
                                <Text style={[s.sectionTitle, { color: subtextColor }]}>CONTACT INFORMATION</Text>
                                <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                    {isEditing ? (
                                        <View style={s.editContainer}>
                                            <View style={s.inputGroup}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Phone Number</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                                                    value={phone}
                                                    onChangeText={setPhone}
                                                    keyboardType="phone-pad"
                                                    placeholder="+62..."
                                                    placeholderTextColor={subtextColor}
                                                />
                                            </View>
                                            <View style={[s.inputGroup, { marginBottom: 0 }]}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Email Address</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                                                    value={email}
                                                    onChangeText={setEmail}
                                                    keyboardType="email-address"
                                                    placeholder="name@adidaya.com"
                                                    placeholderTextColor={subtextColor}
                                                />
                                            </View>
                                        </View>
                                    ) : (
                                        <>
                                            <TouchableOpacity style={s.infoRow} onPress={handleCall} disabled={!member.phone}>
                                                <Ionicons name="call-outline" size={18} color={subtextColor} style={s.infoIcon} />
                                                <View style={s.infoTextContainer}>
                                                    <Text style={s.infoLabel}>Phone</Text>
                                                    <Text style={[s.infoValue, { color: textColor }]}>{member.phone || '-'}</Text>
                                                </View>
                                                {member.phone ? (
                                                    <TouchableOpacity onPress={() => copyToClipboard(member.phone || '', 'Phone Number')} style={{ padding: 4 }}>
                                                        <PlatformIcon name="doc.on.doc" size={16} tintColor={subtextColor} />
                                                    </TouchableOpacity>
                                                ) : null}
                                            </TouchableOpacity>
                                            <View style={[s.divider, { backgroundColor: cardBorder }]} />
                                            <TouchableOpacity style={s.infoRow} onPress={handleEmail} disabled={!member.email}>
                                                <Ionicons name="mail-outline" size={18} color={subtextColor} style={s.infoIcon} />
                                                <View style={s.infoTextContainer}>
                                                    <Text style={s.infoLabel}>Email</Text>
                                                    <Text style={[s.infoValue, { color: textColor }]}>{member.email || '-'}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            </View>

                            {/* Section 3: Payroll Account */}
                            <View style={s.section}>
                                <Text style={[s.sectionTitle, { color: subtextColor }]}>PAYROLL ACCOUNT</Text>
                                <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                    {isEditing ? (
                                        <View style={s.editContainer}>
                                            <View style={s.inputGroup}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Bank Name</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                                                    value={bankName}
                                                    onChangeText={setBankName}
                                                    placeholder="BCA"
                                                    placeholderTextColor={subtextColor}
                                                />
                                            </View>
                                            <View style={s.inputGroup}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Account Number</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                                                    value={bankAccountNumber}
                                                    onChangeText={(v) => setBankAccountNumber(v.replace(/[^0-9]/g, ''))}
                                                    keyboardType="numeric"
                                                    placeholder="12345678"
                                                    placeholderTextColor={subtextColor}
                                                />
                                            </View>
                                            <View style={[s.inputGroup, { marginBottom: 0 }]}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Account Holder Name</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                                                    value={bankAccountName}
                                                    onChangeText={setBankAccountName}
                                                    placeholder="Account Holder Name"
                                                    placeholderTextColor={subtextColor}
                                                />
                                            </View>
                                        </View>
                                    ) : (
                                        <>
                                            <View style={s.infoRowPlain}>
                                                <View style={s.infoTextContainer}>
                                                    <Text style={s.infoLabel}>Bank</Text>
                                                    <Text style={[s.infoValue, { color: textColor, fontWeight: '700' }]}>{member.bankName || '-'}</Text>
                                                </View>
                                            </View>
                                            <View style={[s.divider, { backgroundColor: cardBorder }]} />
                                            <View style={s.infoRowCopy}>
                                                <View style={s.infoTextContainer}>
                                                    <Text style={s.infoLabel}>Account No.</Text>
                                                    <Text style={[s.infoValue, { color: textColor }]}>{member.bankAccountNumber || '-'}</Text>
                                                </View>
                                                {member.bankAccountNumber ? (
                                                    <TouchableOpacity onPress={() => copyToClipboard(member.bankAccountNumber || '', 'Account Number')} style={{ padding: 4 }}>
                                                        <PlatformIcon name="doc.on.doc" size={16} tintColor={subtextColor} />
                                                    </TouchableOpacity>
                                                ) : null}
                                            </View>
                                            <View style={[s.divider, { backgroundColor: cardBorder }]} />
                                            <View style={s.infoRowPlain}>
                                                <View style={s.infoTextContainer}>
                                                    <Text style={s.infoLabel}>Account Name</Text>
                                                    <Text style={[s.infoValue, { color: textColor }]}>{member.bankAccountName || '-'}</Text>
                                                </View>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>

                            {/* Section 4: Documents */}
                            <View style={s.section}>
                                <Text style={[s.sectionTitle, { color: subtextColor }]}>DOCUMENTS</Text>
                                <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder, padding: 12, gap: 10 }]}>
                                    {documents.length === 0 && !isEditing && (
                                        <Text style={{ color: subtextColor, fontSize: 13, textAlign: 'center', paddingVertical: 10 }}>No documents uploaded</Text>
                                    )}
                                    {documents.map((doc) => (
                                        <View key={doc.id} style={s.docItemRow}>
                                            <Ionicons name="document-text-outline" size={20} color={subtextColor} />
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text style={{ color: textColor, fontSize: 14, fontWeight: '700' }}>{doc.label}</Text>
                                                <Text style={{ color: subtextColor, fontSize: 11 }} numberOfLines={1}>{doc.fileName}</Text>
                                            </View>
                                            {isEditing ? (
                                                <TouchableOpacity onPress={() => removeDocument(doc.id)} style={{ padding: 4 }}>
                                                    <PlatformIcon name="trash.fill" size={16} tintColor="#FF3B30" />
                                                </TouchableOpacity>
                                            ) : (
                                                <TouchableOpacity onPress={() => { 
                                                    if (doc.fileUrl.trim().startsWith('<html') || doc.fileUrl.trim().startsWith('<!DOCTYPE html>')) {
                                                        setActiveDocHtml(doc.fileUrl);
                                                        setActiveDocTitle(doc.label); 
                                                    } else if (doc.fileUrl.toLowerCase().includes('.pdf')) {
                                                        setActiveDocUrl(doc.fileUrl);
                                                        setActiveDocTitle(doc.label); 
                                                    } else {
                                                        if (onViewImage) {
                                                            onViewImage(doc.fileUrl, doc.label);
                                                        } else {
                                                            setActiveDocUrl(doc.fileUrl);
                                                            setActiveDocTitle(doc.label); 
                                                        }
                                                    }
                                                }} style={{ padding: 4 }}>
                                                    <PlatformIcon name="eye.fill" size={16} tintColor={subtextColor} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                    {isEditing && (
                                        <TouchableOpacity style={s.addDocBtn} onPress={handleAddDocument}>
                                            <Ionicons name="add" size={16} color={textColor} />
                                            <Text style={[s.addDocText, { color: textColor }]}>Add Document</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* Section 5: Payroll Rates */}
                            <View style={s.section}>
                                <Text style={[s.sectionTitle, { color: subtextColor }]}>PAYROLL RATES</Text>
                                <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                    {isEditing ? (
                                        <View style={s.editContainer}>
                                            <View style={s.switchRow}>
                                                <Text style={[s.switchLabel, { color: textColor }]}>Manually Override Rates</Text>
                                                <Switch
                                                    value={isManualOverride}
                                                    onValueChange={handleToggleOverride}
                                                    trackColor={{ false: '#767577', true: '#34C759' }}
                                                    thumbColor={Platform.OS === 'android' ? '#f4f3f4' : undefined}
                                                />
                                            </View>
                                            <View style={[s.divider, { backgroundColor: cardBorder, marginVertical: 10 }]} />
                                            <View style={s.inputGroup}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Regular Base Daily</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }, !isManualOverride && { opacity: 0.6 }]}
                                                    value={baseRate}
                                                    onChangeText={(v) => setBaseRate(v.replace(/[^0-9]/g, ''))}
                                                    keyboardType="numeric"
                                                    editable={isManualOverride}
                                                    placeholder="Regular Base Daily Rate"
                                                    placeholderTextColor={subtextColor}
                                                />
                                            </View>
                                            <View style={s.inputGroup}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Holiday Daily</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }, !isManualOverride && { opacity: 0.6 }]}
                                                    value={overtimeRate}
                                                    onChangeText={(v) => setOvertimeRate(v.replace(/[^0-9]/g, ''))}
                                                    keyboardType="numeric"
                                                    editable={isManualOverride}
                                                    placeholder="Holiday Daily Rate"
                                                    placeholderTextColor={subtextColor}
                                                />
                                            </View>
                                            <View style={s.inputGroup}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Overtime 1</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }, !isManualOverride && { opacity: 0.6 }]}
                                                    value={otRate1}
                                                    onChangeText={(v) => setOtRate1(v.replace(/[^0-9]/g, ''))}
                                                    keyboardType="numeric"
                                                    editable={isManualOverride}
                                                    placeholder="Overtime 1"
                                                    placeholderTextColor={subtextColor}
                                                />
                                            </View>
                                            <View style={s.inputGroup}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Overtime 2</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }, !isManualOverride && { opacity: 0.6 }]}
                                                    value={otRate2}
                                                    onChangeText={(v) => setOtRate2(v.replace(/[^0-9]/g, ''))}
                                                    keyboardType="numeric"
                                                    editable={isManualOverride}
                                                    placeholder="Overtime 2"
                                                    placeholderTextColor={subtextColor}
                                                />
                                            </View>
                                            <View style={[s.inputGroup, { marginBottom: 0 }]}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Overtime 3</Text>
                                                <TextInput
                                                    style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }, !isManualOverride && { opacity: 0.6 }]}
                                                    value={otRate3}
                                                    onChangeText={(v) => setOtRate3(v.replace(/[^0-9]/g, ''))}
                                                    keyboardType="numeric"
                                                    editable={isManualOverride}
                                                    placeholder="Overtime 3"
                                                    placeholderTextColor={subtextColor}
                                                />
                                            </View>
                                        </View>
                                    ) : (
                                        <>
                                            <View style={s.rateGrid}>
                                                <View style={s.rateItem}>
                                                    <Text style={s.rateLabel}>Daily Base Rate</Text>
                                                    <Text style={[s.rateValue, { color: textColor }]}>{formatCurrency(member.baseDailyRate)}</Text>
                                                </View>
                                                <View style={s.rateItem}>
                                                    <Text style={s.rateLabel}>Holiday Daily Rate</Text>
                                                    <Text style={[s.rateValue, { color: textColor }]}>{formatCurrency(member.overtimeDailyRate)}</Text>
                                                </View>
                                            </View>
                                            <View style={[s.divider, { backgroundColor: cardBorder }]} />
                                            <View style={s.rateGrid}>
                                                <View style={s.rateItem}>
                                                    <Text style={s.rateLabel}>OT1 (Hourly)</Text>
                                                    <Text style={[s.rateValue, { color: textColor }]}>{formatCurrency(member.otRate1)}/hr</Text>
                                                </View>
                                                <View style={s.rateItem}>
                                                    <Text style={s.rateLabel}>OT2 (Hourly)</Text>
                                                    <Text style={[s.rateValue, { color: textColor }]}>{formatCurrency(member.otRate2)}/hr</Text>
                                                </View>
                                            </View>
                                            <View style={[s.divider, { backgroundColor: cardBorder }]} />
                                            <View style={s.rateGrid}>
                                                <View style={s.rateItem}>
                                                    <Text style={s.rateLabel}>OT3 (Hourly)</Text>
                                                    <Text style={[s.rateValue, { color: textColor }]}>{formatCurrency(member.otRate3)}/hr</Text>
                                                </View>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>

                            {/* Section 6: Skills & Certifications */}
                            <View style={s.section}>
                                <Text style={[s.sectionTitle, { color: subtextColor }]}>SKILLS & CERTIFICATIONS</Text>
                                {isEditing ? (
                                    <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder, padding: 16 }]}>
                                        <View style={[s.inputGroup, { marginBottom: 0 }]}>
                                            <Text style={[s.inputLabel, { color: subtextColor }]}>Skills (comma-separated)</Text>
                                            <TextInput
                                                style={[s.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                                                value={skillTagsText}
                                                onChangeText={setSkillTagsText}
                                                placeholder="e.g. Welding, Plumbing, First Aid"
                                                placeholderTextColor={subtextColor}
                                            />
                                        </View>
                                    </View>
                                ) : (
                                    member.skillTags.length > 0 && (
                                        <View style={s.skillsList}>
                                            {member.skillTags.map((tag, idx) => (
                                                <View key={idx} style={[s.skillBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                                    <Text style={[s.skillText, { color: textColor }]}>{tag}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )
                                )}
                            </View>

                            {/* Section 7: Project History */}
                            {!isEditing && (
                                <View style={s.section}>
                                    <Text style={[s.sectionTitle, { color: subtextColor }]}>PROJECT HISTORY</Text>
                                    <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder, padding: 16, gap: 12 }]}>
                                        {memberAssignments.length === 0 ? (
                                            <Text style={{ color: subtextColor, fontSize: 13, textAlign: 'center' }}>No project history</Text>
                                        ) : (
                                            memberAssignments.map((assign, idx) => {
                                                const proj = projects.find(p => p.code === assign.projectCode);
                                                const statusColor = getAssignmentStatusColor(assign.status);
                                                return (
                                                    <View key={assign.id}>
                                                        {idx > 0 && <View style={[s.divider, { backgroundColor: cardBorder, marginVertical: 8 }]} />}
                                                        <View style={{ gap: 2 }}>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <Text style={{ fontSize: 15, fontWeight: '700', color: textColor }}>
                                                                    {assign.projectCode}
                                                                </Text>
                                                                <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, backgroundColor: statusColor + '15' }}>
                                                                    <Text style={{ fontSize: 10, fontWeight: '800', color: statusColor }}>
                                                                        {assign.status}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                            <Text style={{ fontSize: 13, color: subtextColor }}>
                                                                {proj ? proj.name : assign.projectCode}
                                                            </Text>
                                                            <Text style={{ fontSize: 12, color: subtextColor }}>
                                                                {`${assign.startDate} → ${assign.endDate || 'Ongoing'}`}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                );
                                            })
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Section 8: Crew Directory Details */}
                            {!isEditing && (
                                <View style={s.section}>
                                    <Text style={[s.sectionTitle, { color: subtextColor }]}>CREW DIRECTORY DETAILS</Text>
                                    <TouchableOpacity
                                        style={[s.outlineBtn, { borderColor: cardBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', justifyContent: 'center', marginTop: 4 }]}
                                        onPress={handleViewDocument}
                                        activeOpacity={0.7}
                                    >
                                        <PlatformIcon name="doc.plaintext.fill" size={14} tintColor={textColor} style={{ marginRight: 6 }} />
                                        <Text style={[s.outlineBtnText, { color: textColor, fontSize: 13, marginLeft: 6 }]}>View Document</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>

                        {/* Footer Actions */}
                        <View style={s.footer}>
                            {isEditing ? (
                                <>
                                    <TouchableOpacity
                                        style={[s.circleBtn, { backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.1)' }]}
                                        onPress={handleDeleteMember}
                                    >
                                        <PlatformIcon name="trash.fill" size={20} tintColor="#FF3B30" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[s.btn, s.btnSecondary, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                        onPress={() => {
                                            // Reset forms
                                            setName(member.name || '');
                                            setNickname(member.nickname || '');
                                            setPhotoUrl(member.photoUrl || '');
                                            setNik(member.nik || '');
                                            setBirthDate(member.birthDate || '');
                                            setHomeAddress(member.homeAddress || '');
                                            setPhone(member.phone || '');
                                            setEmail(member.email || '');

                                            const rIdx = CREW_ROLE_OPTIONS.findIndex(opt => opt.value === member.role);
                                            setRoleIndex(rIdx >= 0 ? rIdx : 2);
                                            setStatusIndex(member.status === 'ACTIVE' ? 0 : 1);
                                            setSkillTagsText((member.skillTags || []).join(', '));

                                            setBankName(member.bankName || '');
                                            setBankAccountNumber(member.bankAccountNumber || '');
                                            setBankAccountName(member.bankAccountName || '');
                                            setDocuments(member.documents || []);

                                            setBaseRate(String(member.baseDailyRate || 0));
                                            setOvertimeRate(String(member.overtimeDailyRate || 0));
                                            setOtRate1(String(member.otRate1 || 0));
                                            setOtRate2(String(member.otRate2 || 0));
                                            setOtRate3(String(member.otRate3 || 0));
                                            setIsManualOverride(false);

                                            setIsEditing(false);
                                        }}
                                        disabled={saving}
                                    >
                                        <Text style={[s.btnSecondaryText, { color: textColor }]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[s.btn, { backgroundColor: '#007AFF' }]}
                                        onPress={handleSave}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <Text style={s.btnText}>Save</Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[s.btn, s.btnSecondary, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                        onPress={onClose}
                                    >
                                        <Text style={[s.btnSecondaryText, { color: textColor }]}>Close</Text>
                                    </TouchableOpacity>
                                    {onSave && (
                                        <TouchableOpacity
                                            style={[s.btn, { backgroundColor: '#8B5CF6' }]}
                                            onPress={() => setIsEditing(true)}
                                        >
                                            <Text style={s.btnText}>Edit Details</Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}
                        </View>
        </View>
    );

    const docAndPickerModals = (
        <>
            <Modal
                visible={(!!activeDocUrl && activeDocUrl.toLowerCase().includes('.pdf')) || !!activeDocHtml}
                transparent
                animationType="slide"
                onRequestClose={() => { setActiveDocUrl(null); setActiveDocHtml(null); }}
                statusBarTranslucent={true}
            >
                <View style={s.previewOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => { setActiveDocUrl(null); setActiveDocHtml(null); }}
                    />
                    <GlassView
                        intensity={80}
                        style={[
                            s.previewSheet,
                            { backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.95)' }
                        ]}
                    >
                        <View style={s.previewHeader}>
                            <Text style={[s.previewTitle, { color: textColor }]} numberOfLines={1}>
                                {activeDocTitle}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {activeDocHtml && (Print || Sharing) && (
                                    <TouchableOpacity
                                        style={s.previewActionBtn}
                                        onPress={handleExportPDF}
                                        hitSlop={10}
                                    >
                                        <PlatformIcon name="square.and.arrow.up" size={18} tintColor={textColor} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginLeft: 12 }]}
                                    onPress={() => { setActiveDocUrl(null); setActiveDocHtml(null); }}
                                >
                                    <PlatformIcon name="xmark" size={14} tintColor={textColor} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={s.previewContent}>
                            {activeDocHtml ? (
                                WebView ? (
                                    <WebView
                                        source={{ html: activeDocHtml }}
                                        style={s.webview}
                                        scalesPageToFit={true}
                                    />
                                ) : (
                                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                                        <Text style={{ color: textColor }}>WebView is not available on this build.</Text>
                                    </ScrollView>
                                )
                            ) : activeDocUrl ? (
                                activeDocUrl.toLowerCase().includes('.pdf') && WebView ? (
                                    <WebView
                                        source={{ uri: activeDocUrl }}
                                        style={s.webview}
                                        scalesPageToFit={true}
                                    />
                                ) : null
                            ) : null}
                        </View>
                    </GlassView>
                </View>
            </Modal>
            
            {/* Custom Options Picker Modal (Android) */}
            <Modal
                visible={pickerVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setPickerVisible(false)}
            >
                <View style={s.pickerOverlay}>
                    <TouchableOpacity 
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => setPickerVisible(false)}
                    />
                    <GlassView
                        intensity={80}
                        style={[
                            s.pickerSheet,
                            { backgroundColor: isDark ? 'rgba(28,28,30,0.98)' : 'rgba(255,255,255,0.98)' }
                        ]}
                    >
                        <View style={s.pickerHeader}>
                            <Text style={[s.pickerHeaderTitle, { color: textColor }]}>{pickerTitle}</Text>
                            <TouchableOpacity
                                style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                onPress={() => setPickerVisible(false)}
                            >
                                <PlatformIcon name="xmark" size={14} tintColor={subtextColor} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={s.pickerScroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                            {pickerOptions.map((opt) => (
                                <TouchableOpacity
                                    key={opt.label}
                                    style={[s.pickerOptionItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                                    onPress={() => {
                                        if (opt.onPress) {
                                            opt.onPress();
                                        } else {
                                            onPickerSelect(opt.value);
                                        }
                                        setPickerVisible(false);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[s.pickerOptionText, { color: textColor }]}>{opt.label}</Text>
                                    <Ionicons name="chevron-forward" size={14} color={subtextColor} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </GlassView>
                </View>
            </Modal>
        </>
    );

    if (isEmbedded) {
        return (
            <View style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                {bodyContent}
                {docAndPickerModals}
            </View>
        );
    }

    return (
        <>
            <Modal visible={visible} animationType="slide" transparent statusBarTranslucent={true}>
                <View style={s.overlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={onClose}
                    />
                    <GlassView
                        intensity={60}
                        style={[
                            s.sheet,
                            { backgroundColor: isDark ? (Platform.OS === 'android' ? 'rgba(28,28,30,0.98)' : 'rgba(28,28,30,0.85)') : (Platform.OS === 'android' ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.85)') }
                        ]}
                    >
                        {bodyContent}
                    </GlassView>
                </View>
            </Modal>
            {docAndPickerModals}
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
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        paddingHorizontal: Platform.OS === 'ios' ? 8 : 0,
        paddingBottom: Platform.OS === 'ios' ? 8 : 0,
    },
    sheet: {
        height: '90%',
        borderRadius: Platform.OS === 'ios' ? 56 : 32,
        borderBottomLeftRadius: Platform.OS === 'ios' ? 56 : 0,
        borderBottomRightRadius: Platform.OS === 'ios' ? 56 : 0,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: 28,
        paddingBottom: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: 28,
        paddingTop: 8,
        paddingBottom: 40,
    },
    profileContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.2)',
        overflow: 'hidden',
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: '800',
    },
    avatarHelperText: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 6,
    },
    memberName: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    memberRole: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 12,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    infoRowPlain: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    infoRowCopy: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        justifyContent: 'space-between',
    },
    infoIcon: {
        marginRight: 16,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 10,
        color: '#8E8E93',
        fontWeight: '600',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    divider: {
        height: 1,
    },
    rateGrid: {
        flexDirection: 'row',
        padding: 16,
    },
    rateItem: {
        flex: 1,
    },
    rateLabel: {
        fontSize: 10,
        color: '#8E8E93',
        fontWeight: '600',
        marginBottom: 4,
    },
    rateValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    skillsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    skillBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    skillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    outlineBtn: {
        height: 48,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    outlineBtnText: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 10,
    },
    compactBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 4,
    },
    compactBtnText: {
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 6,
    },
    footer: {
        width: '100%',
        paddingHorizontal: 28,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        flexDirection: 'row',
        gap: 12,
    },
    btn: {
        flex: 1,
        height: 52,
        borderRadius: 26,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    btnSecondary: {
        flex: 0.5,
    },
    btnSecondaryText: {
        fontSize: 16,
        fontWeight: '700',
    },
    circleBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Edit Mode styling
    editContainer: {
        padding: 16,
        gap: 12,
    },
    inputGroup: {
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4,
    },
    input: {
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 14,
        fontWeight: '600',
    },
    pickerTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    toggleContainer: {
        paddingVertical: 12,
        gap: 4,
    },
    toggleRow: {
        flexDirection: 'row',
        gap: 10,
    },
    toggleBtn: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
    },
    toggleTextActive: {
        color: '#FFF',
        fontWeight: '800',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    switchLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    docItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    addDocBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(0, 0, 0, 0.15)',
        marginTop: 6,
    },
    addDocText: {
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 6,
    },

    // Preview modal styling
    previewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    previewSheet: {
        height: '90%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: 28,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    previewTitle: {
        fontSize: 18,
        fontWeight: '800',
        flex: 1,
        marginRight: 10,
    },
    previewActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    webview: {
        width: SCREEN_WIDTH,
        height: '100%',
        backgroundColor: 'transparent',
    },
    previewImage: {
        width: SCREEN_WIDTH * 0.95,
        height: '90%',
    },
    
    // Custom Picker styles
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    pickerSheet: {
        maxHeight: '60%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        paddingHorizontal: 24,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 24,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    pickerHeaderTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    pickerScroll: {
        marginTop: 8,
    },
    pickerOptionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pickerOptionText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
