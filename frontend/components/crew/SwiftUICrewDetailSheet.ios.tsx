import React, { useState, useEffect } from 'react';
import { Alert, Linking, Platform, Image, Dimensions, View, UIManager, Clipboard, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    Switch,
    LabeledContent,
    ZStack,
    Image as SwiftUIImage,
    Text as SwiftUIText 
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, cornerRadius, frame, foregroundColor, tint, disabled, clipShape, onTapGesture } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { SwiftUIImagePreviewSheet } from './SwiftUIImagePreviewSheet';
import { CrewMember, CrewDocument, DocumentType, Assignment, Project, CrewRole, CrewStatus, CREW_ROLE_OPTIONS, CREW_ROLE_LABELS, DOCUMENT_TYPE_LABELS, generateCrewId, matchProjectCode } from './mockData';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadCrewFileBase64 } from '@/lib/api/attendance';
import { PlatformIcon } from '../ui/PlatformIcon';
import { GlassView } from '../ui/GlassView';

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

// Safe lazy loading of react-native-webview to avoid crash if the native module is not compiled in the binary
let WebView: any = null;
let isWebViewAvailable = false;
try {
    const { WebView: WV } = require('react-native-webview');
    WebView = WV;
    isWebViewAvailable = !!UIManager.getViewManagerConfig('RNCWebView');
} catch (e) {
    // Silently handled — opens in browser instead
}

const DEFAULT_RATES_BY_ROLE: Record<CrewRole, { base: number; overtime: number; ot1: number; ot2: number; ot3: number }> = {
    FOREMAN: { base: 350000, overtime: 450000, ot1: 60000, ot2: 80000, ot3: 100000 },
    LEADER: { base: 280000, overtime: 360000, ot1: 50000, ot2: 70000, ot3: 90000 },
    SKILLED: { base: 220000, overtime: 300000, ot1: 40000, ot2: 55000, ot3: 70000 },
    OPERATOR: { base: 300000, overtime: 400000, ot1: 55000, ot2: 75000, ot3: 95000 },
    HELPER: { base: 150000, overtime: 200000, ot1: 25000, ot2: 35000, ot3: 45000 },
    GENERAL: { base: 140000, overtime: 180000, ot1: 20000, ot2: 30000, ot3: 40000 }
};

interface SwiftUICrewDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    member: CrewMember | null;
    onEdit?: (member: CrewMember) => void;
    onSave?: (member: CrewMember) => void;
    onDelete?: (id: string) => void;
    onViewDocument?: (html: string, title: string) => void;
    onViewImage?: (imageUrl: string, title: string) => void;
    assignments?: Assignment[];
    projects?: Project[];
    crewMembers?: CrewMember[];
}

export const SwiftUICrewDetailSheet: React.FC<SwiftUICrewDetailSheetProps> = ({
    isOpened,
    onClose,
    member,
    onEdit,
    onSave,
    onDelete,
    onViewDocument,
    onViewImage,
    assignments = [],
    projects = [],
    crewMembers = [],
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';
    const sheetBg = 'clear';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
    const menuControlModifiers = [tint(isDark ? '#007AFF' : '#1C1C1E')];
    const textFieldModifiers = [tint('#007AFF')];
    const roleOptions = CREW_ROLE_OPTIONS.map(opt => opt.label);

    const generateProfileHtml = () => {
        if (!member) return '';
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
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const docTitle = `Crew_Profile_${name.replace(/\s+/g, '_')}_${dateStr}`;
        if (onViewDocument) {
            onViewDocument(html, docTitle);
        }
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

    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    // Document Preview
    const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);
    const [activeDocHtml, setActiveDocHtml] = useState<string | null>(null);
    const [activeDocTitle, setActiveDocTitle] = useState<string>('');
    // Editable fields
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

    useEffect(() => {
        if (isOpened && member) {
            setName(member.name || '');
            setNickname(member.nickname || '');
            setPhotoUrl(member.photoUrl || '');
            setNik(member.nik || '');
            setBirthDate(member.birthDate || '');
            setHomeAddress(member.homeAddress || '');
            setPhone(member.phone || '');
            setEmail(member.email || '');
            
            // Map role & status indexes
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

            // Check if rate override is active
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
    }, [member, isOpened]);

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

    if (!member) return null;

    const crewId = generateCrewId(member, crewMembers, assignments);
    const currentProject = projects.find(p => p.code === member.projectCode);
    const projectName = (currentProject ? `${currentProject.code} - ${currentProject.name}` : member.projectCode) || '';

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

    const memberAssignments = [...assignments.filter(a => a.crewId === member.id)];
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

    const handleAddDocument = () => {
        // Pick document type first
        const typeOptions = Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({
            text: label,
            onPress: () => pickDocumentFile(value as DocumentType, label),
        }));
        Alert.alert('Document Type', 'Choose the document type', [
            ...typeOptions,
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const pickDocumentFile = (docType: DocumentType, label: string) => {
        Alert.alert('Attach File', 'Choose a source', [
            {
                text: 'Photo Library',
                onPress: async () => {
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
                },
            },
            {
                text: 'Files / PDF',
                onPress: async () => {
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
                },
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
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
        let uploadWarnings: string[] = [];
        try {
            // Upload new profile picture if local
            let uploadedPhotoUrl = photoUrl;
            if (photoUrl && !photoUrl.startsWith('http')) {
                try {
                    const base64 = await FileSystem.readAsStringAsync(photoUrl, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    const ext = photoUrl.split('.').pop() || 'jpg';
                    uploadedPhotoUrl = await uploadCrewFileBase64(base64, ext, 'image/jpeg');
                } catch (uploadErr: any) {
                    uploadWarnings.push('Profile photo');
                    uploadedPhotoUrl = photoUrl; // keep local, will retry next save
                }
            }

            // Upload new local documents to Supabase
            const uploadedDocs: CrewDocument[] = [];
            for (const doc of documents) {
                if (doc.fileUrl.startsWith('http')) {
                    uploadedDocs.push(doc);
                } else {
                    try {
                        const base64 = await FileSystem.readAsStringAsync(doc.fileUrl, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                        const ext = doc.fileName.split('.').pop() || 'jpg';
                        const mimeType = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
                        const url = await uploadCrewFileBase64(base64, ext, mimeType);
                        uploadedDocs.push({ ...doc, fileUrl: url });
                    } catch (docErr: any) {
                        uploadWarnings.push(`${doc.label || doc.type}`);
                        uploadedDocs.push(doc); // keep local URI, will retry next save
                    }
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

            if (uploadWarnings.length > 0) {
                Alert.alert(
                    'Saved with warnings',
                    `Data saved, but these files failed to upload (check your connection):\n• ${uploadWarnings.join('\n• ')}`
                );
            }
        } catch (err: any) {
            Alert.alert('Save Error', err.message || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };


    const statusBgColor = member.status === 'ACTIVE' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)';
    const statusTextColor = member.status === 'ACTIVE' ? '#34C759' : '#FF3B30';

    const getAssignmentStatusColor = (status: string) => {
        if (status === 'ACTIVE') return '#34C759';
        if (status === 'COMPLETED') return '#8E8E93';
        return '#FF9500';
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet 
                isOpened={isOpened}
                presentationDetents={[0.92]}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                    <VStack spacing={0} modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background(sheetBg)
                    ]}>
                        {/* Header */}
                        <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                            <SwiftUIText size={22} weight="bold" color={textColor}>
                                {isEditing ? name : member.name}
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
                            {/* Section 0: Employment Information */}
                            <Section title="Employment Information">
                                {isEditing ? (
                                    <>
                                        <VStack alignment="center" spacing={4} modifiers={[padding({ vertical: 8 }), frame({ maxWidth: Infinity })]}>
                                            <VStack alignment="center" modifiers={[
                                                frame({ width: 72, height: 72 }),
                                                background(isDark ? 'rgba(0, 122, 255, 0.18)' : 'rgba(0, 122, 255, 0.1)'),
                                                cornerRadius(36),
                                                onTapGesture(handlePickAvatar)
                                            ]}>
                                                {photoUrl ? (
                                                    <View style={{ width: 72, height: 72, borderRadius: 36, overflow: 'hidden' }}>
                                                        <Image
                                                            source={{ uri: photoUrl }}
                                                            style={{ width: 72, height: 72 }}
                                                            resizeMode="cover"
                                                        />
                                                    </View>
                                                ) : (
                                                    <SwiftUIText size={26} weight="bold" color={isDark ? '#FFFFFF' : '#007AFF'}>{member.initials}</SwiftUIText>
                                                )}
                                            </VStack>
                                            <SwiftUIText size={11} color="#007AFF" weight="semibold">Tap avatar to change photo</SwiftUIText>
                                        </VStack>
                                        <Picker
                                            label="Role"
                                            options={roleOptions}
                                            selectedIndex={roleIndex}
                                            onOptionSelected={(e) => handleRoleChange(e.nativeEvent.index)}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                            modifiers={menuControlModifiers}
                                        />
                                        <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText size={13} color={subtextColor}>Status</SwiftUIText>
                                            <Picker
                                                options={['ACTIVE', 'INACTIVE']}
                                                selectedIndex={statusIndex}
                                                onOptionSelected={(e) => setStatusIndex(e.nativeEvent.index)}
                                                variant="segmented"
                                                modifiers={[
                                                    tint(statusIndex === 0 ? '#34C759' : '#FF3B30')
                                                ]}
                                            />
                                        </VStack>
                                        {member.projectCode ? (
                                             <HStack modifiers={[padding({ vertical: 6 })]}>
                                                 <SwiftUIText color={subtextColor}>Current Project</SwiftUIText>
                                                 <Spacer />
                                                 <SwiftUIText color={textColor}>{projectName}</SwiftUIText>
                                             </HStack>
                                         ) : null}
                                         <HStack modifiers={[padding({ vertical: 6 })]}>
                                             <SwiftUIText color={subtextColor}>Crew ID</SwiftUIText>
                                             <Spacer />
                                             <SwiftUIText color={textColor} weight="semibold">{crewId}</SwiftUIText>
                                         </HStack>
                                    </>
                                ) : (
                                    <>
                                        <VStack alignment="center" spacing={4} modifiers={[padding({ vertical: 8 }), frame({ maxWidth: Infinity })]}>
                                            <VStack alignment="center" modifiers={[
                                                frame({ width: 72, height: 72 }),
                                                background(isDark ? 'rgba(0, 122, 255, 0.18)' : 'rgba(0, 122, 255, 0.1)'),
                                                cornerRadius(36)
                                            ]}>
                                                {photoUrl ? (
                                                    <View style={{ width: 72, height: 72, borderRadius: 36, overflow: 'hidden' }}>
                                                        <Image
                                                            source={{ uri: photoUrl }}
                                                            style={{ width: 72, height: 72 }}
                                                            resizeMode="cover"
                                                        />
                                                    </View>
                                                ) : (
                                                    <SwiftUIText size={26} weight="bold" color={isDark ? '#FFFFFF' : '#007AFF'}>{member.initials}</SwiftUIText>
                                                )}
                                            </VStack>
                                        </VStack>
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Role</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>{CREW_ROLE_LABELS[member.role] || member.role}</SwiftUIText>
                                        </HStack>
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Status</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={member.status === 'ACTIVE' ? '#34C759' : '#FF3B30'} weight="semibold">{member.status}</SwiftUIText>
                                        </HStack>
                                        {member.projectCode ? (
                                            <HStack modifiers={[padding({ vertical: 6 })]}>
                                                <SwiftUIText color={subtextColor}>Current Project</SwiftUIText>
                                                <Spacer />
                                                <SwiftUIText color={textColor}>{projectName}</SwiftUIText>
                                            </HStack>
                                        ) : null}
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Crew ID</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor} weight="semibold">{crewId}</SwiftUIText>
                                        </HStack>
                                    </>
                                )}
                            </Section>

                            {/* Section 1: Data Diri */}
                            <Section title="Personal Information">
                                {isEditing ? (
                                    <>
                                        <TextField placeholder="Full Name *" defaultValue={name} onChangeText={setName} modifiers={textFieldModifiers} />
                                        <TextField placeholder="Nickname" defaultValue={nickname} onChangeText={setNickname} modifiers={textFieldModifiers} />
                                        <TextField placeholder="NIK (16 digits)" defaultValue={nik} onChangeText={(v) => setNik(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" modifiers={textFieldModifiers} />
                                        <TextField placeholder="Birth Date (YYYY-MM-DD)" defaultValue={birthDate} onChangeText={setBirthDate} modifiers={textFieldModifiers} />
                                        <TextField placeholder="Home Address" defaultValue={homeAddress} onChangeText={setHomeAddress} modifiers={textFieldModifiers} />
                                    </>
                                ) : (
                                    <>
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Full Name</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" color={textColor}>{member.name}</SwiftUIText>
                                        </HStack>
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Nickname</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>{member.nickname || '-'}</SwiftUIText>
                                        </HStack>
                                        <HStack alignment="center" modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>NIK</SwiftUIText>
                                            <Spacer />
                                            <HStack spacing={4} alignment="center">
                                                <SwiftUIText color={textColor}>{member.nik || '-'}</SwiftUIText>
                                                {member.nik ? (
                                                    <Button
                                                        systemImage="doc.on.doc"
                                                        variant="plain"
                                                        color="gray"
                                                        onPress={() => copyToClipboard(member.nik || '', 'NIK')}
                                                    />
                                                ) : null}
                                            </HStack>
                                        </HStack>
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Birth Date</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>{member.birthDate || '-'}</SwiftUIText>
                                        </HStack>
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Home Address</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>{member.homeAddress || '-'}</SwiftUIText>
                                        </HStack>
                                    </>
                                )}
                            </Section>

                            {/* Section 2: Contact Information */}
                            <Section title="Contact Information">
                                {isEditing ? (
                                    <>
                                        <TextField placeholder="Phone Number" defaultValue={phone} onChangeText={setPhone} keyboardType="phone-pad" modifiers={textFieldModifiers} />
                                        <TextField placeholder="Email Address" defaultValue={email} onChangeText={setEmail} keyboardType="email-address" modifiers={textFieldModifiers} />
                                    </>
                                ) : (
                                     <>
                                         <HStack alignment="center" modifiers={[padding({ vertical: 6 })]}>
                                             <SwiftUIText color={subtextColor}>Phone</SwiftUIText>
                                             <Spacer />
                                             <HStack spacing={4} alignment="center">
                                                 <SwiftUIText color={textColor}>{member.phone || '-'}</SwiftUIText>
                                                 {member.phone ? (
                                                     <Button
                                                         systemImage="doc.on.doc"
                                                         variant="plain"
                                                         color="gray"
                                                         onPress={() => copyToClipboard(member.phone || '', 'Phone Number')}
                                                     />
                                                 ) : null}
                                             </HStack>
                                         </HStack>
                                         <HStack modifiers={[padding({ vertical: 6 })]}>
                                             <SwiftUIText color={subtextColor}>Email</SwiftUIText>
                                             <Spacer />
                                             <SwiftUIText color={textColor}>{member.email || '-'}</SwiftUIText>
                                         </HStack>
                                     </>
                                )}
                            </Section>

                            {/* Section 3: Payroll Account */}
                            <Section title="Payroll Account">
                                {isEditing ? (
                                    <>
                                        <TextField placeholder="Bank Name" defaultValue={bankName} onChangeText={setBankName} modifiers={textFieldModifiers} />
                                        <TextField placeholder="Account Number" defaultValue={bankAccountNumber} onChangeText={(v) => setBankAccountNumber(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" modifiers={textFieldModifiers} />
                                        <TextField placeholder="Account Holder Name" defaultValue={bankAccountName} onChangeText={setBankAccountName} modifiers={textFieldModifiers} />
                                    </>
                                ) : (
                                    <>
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Bank</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" color={textColor}>{member.bankName || '-'}</SwiftUIText>
                                        </HStack>
                                        <HStack alignment="center" modifiers={[padding({ vertical: 6 })]}>
                                             <SwiftUIText color={subtextColor}>Account No.</SwiftUIText>
                                             <Spacer />
                                             <HStack spacing={4} alignment="center">
                                                 <SwiftUIText color={textColor}>{member.bankAccountNumber || '-'}</SwiftUIText>
                                                 {member.bankAccountNumber ? (
                                                     <Button
                                                         systemImage="doc.on.doc"
                                                         variant="plain"
                                                         color="gray"
                                                         onPress={() => copyToClipboard(member.bankAccountNumber || '', 'Account Number')}
                                                     />
                                                 ) : null}
                                             </HStack>
                                         </HStack>
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Account Name</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>{member.bankAccountName || '-'}</SwiftUIText>
                                        </HStack>
                                    </>
                                )}
                            </Section>

                            {/* Section 4: Documents */}
                            <Section title="Documents">
                                {documents.length === 0 && !isEditing && (
                                    <SwiftUIText color={subtextColor}>No documents uploaded</SwiftUIText>
                                )}
                                {documents.map((doc) => (
                                    <HStack key={doc.id} alignment="center" modifiers={[padding({ vertical: 6 })]}>
                                        <VStack alignment="leading" spacing={2}>
                                            <SwiftUIText size={14} weight="semibold" color={textColor}>{doc.label}</SwiftUIText>
                                            <SwiftUIText size={12} color={subtextColor}>{doc.fileName}</SwiftUIText>
                                        </VStack>
                                        <Spacer />
                                        {isEditing ? (
                                            <Button systemImage="trash.fill" color="red" onPress={() => removeDocument(doc.id)} />
                                        ) : (
                                            <Button
                                                systemImage="eye"
                                                color="gray"
                                                onPress={() => {
                                                    if (doc.fileUrl.toLowerCase().includes('.pdf')) {
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
                                                }}
                                            />
                                        )}
                                    </HStack>
                                ))}
                                {isEditing && (
                                    <Button
                                        variant="glass"
                                        onPress={handleAddDocument}
                                        modifiers={[cornerRadius(18)]}
                                    >
                                        <HStack modifiers={[frame({ height: 36 })]}>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" size={15} color={textColor}>
                                                + Add Document
                                            </SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                    </Button>
                                )}
                            </Section>

                            {/* Payroll Rates */}
                            <Section title="Payroll Rates">
                                {isEditing ? (
                                    <>
                                        <VStack spacing={8} alignment="leading" modifiers={[padding({ vertical: 4 })]}>
                                            <Switch
                                                label="Manually Override Rates"
                                                value={isManualOverride}
                                                onValueChange={handleToggleOverride}
                                                color="#34C759"
                                            />
                                        </VStack>
                                        <LabeledContent label="Regular Base Daily">
                                            <TextField
                                                key={`base-${roleIndex}-${isManualOverride}`}
                                                placeholder="Regular Base Daily Rate"
                                                defaultValue={baseRate}
                                                onChangeText={(v) => {
                                                    const clean = v.replace(/[^0-9]/g, '');
                                                    setBaseRate(clean);
                                                }}
                                                keyboardType="numeric"
                                                modifiers={[
                                                    disabled(!isManualOverride),
                                                    tint('#007AFF')
                                                ]}
                                            />
                                        </LabeledContent>
                                        <LabeledContent label="Holiday Daily">
                                            <TextField
                                                key={`overtime-${roleIndex}-${isManualOverride}`}
                                                placeholder="Holiday Daily Rate"
                                                defaultValue={overtimeRate}
                                                onChangeText={(v) => {
                                                    const clean = v.replace(/[^0-9]/g, '');
                                                    setOvertimeRate(clean);
                                                }}
                                                keyboardType="numeric"
                                                modifiers={[
                                                    disabled(!isManualOverride),
                                                    tint('#007AFF')
                                                ]}
                                            />
                                        </LabeledContent>
                                        <LabeledContent label="Overtime 1">
                                            <TextField
                                                key={`ot1-${roleIndex}-${isManualOverride}`}
                                                placeholder="Overtime 1"
                                                defaultValue={otRate1}
                                                onChangeText={(v) => {
                                                    const clean = v.replace(/[^0-9]/g, '');
                                                    setOtRate1(clean);
                                                }}
                                                keyboardType="numeric"
                                                modifiers={[
                                                    disabled(!isManualOverride),
                                                    tint('#007AFF')
                                                ]}
                                            />
                                        </LabeledContent>
                                        <LabeledContent label="Overtime 2">
                                            <TextField
                                                key={`ot2-${roleIndex}-${isManualOverride}`}
                                                placeholder="Overtime 2"
                                                defaultValue={otRate2}
                                                onChangeText={(v) => {
                                                    const clean = v.replace(/[^0-9]/g, '');
                                                    setOtRate2(clean);
                                                }}
                                                keyboardType="numeric"
                                                modifiers={[
                                                    disabled(!isManualOverride),
                                                    tint('#007AFF')
                                                ]}
                                            />
                                        </LabeledContent>
                                        <LabeledContent label="Overtime 3">
                                            <TextField
                                                key={`ot3-${roleIndex}-${isManualOverride}`}
                                                placeholder="Overtime 3"
                                                defaultValue={otRate3}
                                                onChangeText={(v) => {
                                                    const clean = v.replace(/[^0-9]/g, '');
                                                    setOtRate3(clean);
                                                }}
                                                keyboardType="numeric"
                                                modifiers={[
                                                    disabled(!isManualOverride),
                                                    tint('#007AFF')
                                                ]}
                                            />
                                        </LabeledContent>
                                    </>
                                ) : (
                                    <>
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Daily Base Rate</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" color={textColor}>{formatCurrency(member.baseDailyRate)}</SwiftUIText>
                                        </HStack>
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Holiday Daily Rate</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" color={textColor}>{formatCurrency(member.overtimeDailyRate)}</SwiftUIText>
                                        </HStack>
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Overtime 1</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>{`${formatCurrency(member.otRate1)}/hr`}</SwiftUIText>
                                        </HStack>
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Overtime 2</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>{`${formatCurrency(member.otRate2)}/hr`}</SwiftUIText>
                                        </HStack>
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Overtime 3</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>{`${formatCurrency(member.otRate3)}/hr`}</SwiftUIText>
                                        </HStack>
                                    </>
                                )}
                            </Section>

                            {/* Skills & Certifications */}
                            <Section title="Skills & Certifications">
                                {isEditing ? (
                                    <TextField placeholder="Skills & Tags (comma-separated)" defaultValue={skillTagsText} onChangeText={setSkillTagsText} modifiers={textFieldModifiers} />
                                ) : (
                                    <>
                                        {member.skillTags.length === 0 ? (
                                            <SwiftUIText color={subtextColor}>No skills specified</SwiftUIText>
                                        ) : (
                                            <VStack alignment="leading" spacing={8} modifiers={[padding({ vertical: 6 })]}>
                                                <SwiftUIText color={textColor}>
                                                    {member.skillTags.join(' • ')}
                                                </SwiftUIText>
                                            </VStack>
                                        )}
                                    </>
                                )}
                            </Section>

                            <Section title="Project History">
                                {memberAssignments.length === 0 ? (
                                    <SwiftUIText color={subtextColor}>No project history</SwiftUIText>
                                ) : (
                                    memberAssignments.map(assign => {
                                        const proj = projects.find(p => p.code === assign.projectCode);
                                        const statusColor = getAssignmentStatusColor(assign.status);
                                        return (
                                            <VStack key={assign.id} alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                                <HStack alignment="center">
                                                    <SwiftUIText size={15} weight="semibold" color={textColor}>
                                                        {assign.projectCode}
                                                    </SwiftUIText>
                                                    <Spacer />
                                                    <SwiftUIText
                                                        size={10}
                                                        weight="bold"
                                                        modifiers={[
                                                            padding({ vertical: 3, horizontal: 8 }),
                                                            background(statusColor + '22'),
                                                            cornerRadius(8),
                                                            foregroundColor(statusColor)
                                                        ]}
                                                    >
                                                        {assign.status}
                                                    </SwiftUIText>
                                                </HStack>
                                                <SwiftUIText size={13} color={subtextColor}>
                                                    {proj ? proj.name : assign.projectCode}
                                                </SwiftUIText>
                                                <SwiftUIText size={12} color={subtextColor}>
                                                    {`${assign.startDate} → ${assign.endDate || 'Ongoing'}`}
                                                </SwiftUIText>
                                            </VStack>
                                        );
                                    })
                                )}
                            </Section>

                            {/* Section 5: Crew Directory Details – hidden on iOS (WebView not supported yet) */}
                            {/* {!isEditing && (
                                <Section title="Crew Directory Details">
                                    <Button
                                        variant="glass"
                                        color="gray"
                                        onPress={handleViewDocument}
                                        modifiers={[
                                            frame({ maxWidth: Infinity }),
                                            cornerRadius(999)
                                        ]}
                                    >
                                        <HStack spacing={6} modifiers={[
                                            frame({ maxWidth: Infinity }),
                                            frame({ height: 44 })
                                        ]}>
                                            <Spacer />
                                            <SwiftUIImage systemName="doc.plaintext.fill" size={14} color="gray" />
                                            <SwiftUIText size={13} weight="semibold" color="gray">View Document</SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                    </Button>
                                </Section>
                            )} */}

                        </Form>

                        {/* Footer buttons */}
                        <VStack spacing={12} modifiers={[
                            background(sheetBg),
                            padding({ top: 12, leading: 20, trailing: 20, bottom: Platform.OS === 'ios' ? 36 : 24 }),
                            frame({ maxWidth: Infinity })
                        ]}>
                            <HStack spacing={12}>
                                {isEditing ? (
                                    <>
                                        <Button
                                            systemImage="trash"
                                            variant="glass"
                                            color="red"
                                            onPress={handleDeleteMember}
                                            modifiers={[frame({ width: 44, height: 44 }), cornerRadius(22)]}
                                        />
                                        <Button
                                            variant="glass"
                                            color="gray"
                                            onPress={() => {
                                                // Reset to original
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
                                            }}
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
                                                    {saving ? 'Saving...' : 'Save'}
                                                </SwiftUIText>
                                                <Spacer />
                                            </HStack>
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="glass"
                                            color="gray"
                                            onPress={onClose}
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
                                                <SwiftUIText weight="semibold" size={17}>Close</SwiftUIText>
                                                <Spacer />
                                            </HStack>
                                        </Button>
                                        <Button
                                            variant="borderedProminent"
                                            color="#007AFF"
                                            onPress={() => setIsEditing(true)}
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
                                                <SwiftUIText weight="semibold" size={17} color="#FFFFFF">Edit Details</SwiftUIText>
                                                <Spacer />
                                            </HStack>
                                        </Button>
                                    </>
                                )}
                            </HStack>
                        </VStack>
                    </VStack>
                </BottomSheet>
        </Host>
    );
};
