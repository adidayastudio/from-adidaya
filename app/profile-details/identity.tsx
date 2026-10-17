import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SwiftUIUnsavedBanner } from '@/components/ui/SwiftUIUnsavedBanner';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { formatAddressValue } from '@/components/people/member-profile/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { decode } from 'base64-arraybuffer';
import { Image } from 'expo-image';
import { DocumentPreviewDrawer, PreviewDocItem } from '@/components/people/DocumentPreviewDrawer';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Linking,
    Platform,
    StatusBar as RNStatusBar,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// Safe lazy loading of SwiftUI components
let SwiftUIHost: any = null;
let SwiftUIButton: any = null;
let SwiftUIText: any = null;
let SwiftUIPicker: any = null;
let SwiftUIHStack: any = null;
let SwiftUISpacer: any = null;
let swiftModifiers: any = null;
if (Platform.OS === 'ios') {
    try {
        const SwiftUI = require('@expo/ui/swift-ui');
        SwiftUIHost = SwiftUI.Host;
        SwiftUIButton = SwiftUI.Button;
        SwiftUIText = SwiftUI.Text;
        SwiftUIPicker = SwiftUI.Picker;
        SwiftUIHStack = SwiftUI.HStack;
        SwiftUISpacer = SwiftUI.Spacer;
        swiftModifiers = require('@expo/ui/swift-ui/modifiers');
    } catch (e) {
        // handled
    }
}

// Indonesian Bank Configuration
export interface BankConfig {
    id: string;
    label: string;
    code: string;
    digits: number | [number, number];
}

const BANK_OPTIONS: BankConfig[] = [
    { id: 'BCA', label: 'BCA', code: '014', digits: 10 },
    { id: 'BRI', label: 'BRI', code: '002', digits: 15 },
    { id: 'BNI', label: 'BNI', code: '009', digits: 10 },
    { id: 'Mandiri', label: 'Mandiri', code: '008', digits: 13 },
    { id: 'Bank Syariah Indonesia (BSI)', label: 'Bank Syariah Indonesia (BSI)', code: '451', digits: 10 },
    { id: 'CIMB Niaga', label: 'CIMB Niaga', code: '022', digits: [13, 14] },
    { id: 'Permata Bank', label: 'Permata Bank', code: '013', digits: 10 },
    { id: 'BTN', label: 'BTN', code: '200', digits: 16 },
    { id: 'Bank Danamon', label: 'Bank Danamon', code: '011', digits: 10 },
    { id: 'OCBC Indonesia', label: 'OCBC Indonesia', code: '028', digits: 12 },
    { id: 'Maybank Indonesia', label: 'Maybank Indonesia', code: '016', digits: 10 },
    { id: 'Bank Mega', label: 'Bank Mega', code: '426', digits: 10 },
    { id: 'Bank Jago', label: 'Bank Jago', code: '542', digits: 12 },
    { id: 'SeaBank', label: 'SeaBank', code: '535', digits: 10 },
    { id: 'blu by BCA Digital', label: 'blu by BCA Digital', code: '501', digits: 12 },
    { id: 'Allo Bank', label: 'Allo Bank', code: '567', digits: 10 },
    { id: 'Other', label: 'Other', code: '999', digits: [6, 20] },
];

const RELATIONSHIP_OPTIONS = [
    'Spouse',
    'Parent',
    'Child',
    'Partner',
    'Friend',
    'Family',
    'Other',
];

const SOCIAL_PLATFORMS: { id: string; label: string; icon: string; prefix: string; baseUrl: string }[] = [
    { id: 'x', label: 'X (Twitter)', icon: 'bubble.left.and.bubble.right', prefix: '@', baseUrl: 'https://x.com/' },
    { id: 'facebook', label: 'Facebook', icon: 'person.2', prefix: '', baseUrl: 'https://facebook.com/' },
    { id: 'github', label: 'GitHub', icon: 'chevron.left.forwardslash.chevron.right', prefix: '', baseUrl: 'https://github.com/' },
    { id: 'tiktok', label: 'TikTok', icon: 'play.rectangle', prefix: '@', baseUrl: 'https://tiktok.com/@' },
    { id: 'website', label: 'Website / Portfolio', icon: 'globe', prefix: 'https://', baseUrl: '' },
];

// Bouncy Tactile Plus Button with Spring Scale & Haptics
function BouncyAddButton({ onPress, isDark, isUploading }: { onPress: () => void; isDark: boolean; isUploading?: boolean }) {
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={animStyle}>
            <TouchableOpacity
                style={{ width: 30, height: 30, borderRadius: 15, overflow: 'hidden' }}
                activeOpacity={0.7}
                onPressIn={() => {
                    scale.value = withSpring(0.85, { damping: 15, stiffness: 400 });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                onPressOut={() => {
                    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
                }}
                onPress={onPress}
                disabled={isUploading}
            >
                <GlassView
                    intensity={isDark ? 20 : 30}
                    style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)', borderRadius: 15 }]}
                    tint={isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
                >
                    {isUploading ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                        <PlatformIcon name="plus" size={14} tintColor="#007AFF" />
                    )}
                </GlassView>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function IdentityScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const { profile, refreshProfile } = useUserContext();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const bgColor = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.7)';
    const intensity = isDark ? 10 : 25;

    // Document state
    const [userDocs, setUserDocs] = useState<any[]>([]);
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
    const [selectedDoc, setSelectedDoc] = useState<PreviewDocItem | null>(null);

    // Active Edit Section
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Form inputs state
    const [fullName, setFullName] = useState('');
    const [nickname, setNickname] = useState('');
    const [birthday, setBirthday] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Not Specified'>('Male');
    const [nik, setNik] = useState('');

    const [personalEmail, setPersonalEmail] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    const [currentAddress, setCurrentAddress] = useState('');
    const [ktpAddress, setKtpAddress] = useState('');

    const parseAddr = (a: any): { current: string; ktp: string } => {
        if (!a) return { current: '', ktp: '' };
        let parsed = a;
        if (typeof a === 'string') {
            const trimmed = a.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                try {
                    parsed = JSON.parse(trimmed);
                } catch {
                    return { current: trimmed, ktp: '' };
                }
            } else {
                return { current: trimmed, ktp: '' };
            }
        }
        if (parsed && typeof parsed === 'object') {
            if (parsed.current !== undefined || parsed.ktp !== undefined) {
                return {
                    current: formatAddressValue(parsed.current),
                    ktp: formatAddressValue(parsed.ktp),
                };
            }
            return {
                current: formatAddressValue(parsed),
                ktp: '',
            };
        }
        return { current: String(parsed || ''), ktp: '' };
    };

    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyRelationship, setEmergencyRelationship] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');

    const [linkedin, setLinkedin] = useState('');
    const [instagram, setInstagram] = useState('');
    const [extraSocials, setExtraSocials] = useState<Array<{ platform: string; value: string }>>([]);

    const [bankName, setBankName] = useState('');
    const [customBankName, setCustomBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [showAccountNumber, setShowAccountNumber] = useState(false);

    const selectedBank = BANK_OPTIONS.find(b => b.id === bankName || b.label === bankName) || (bankName ? BANK_OPTIONS[BANK_OPTIONS.length - 1] : undefined);

    const fetchDocs = async () => {
        if (!profile?.id) return;
        try {
            const { data, error } = await supabase
                .from('user_documents')
                .select('*')
                .eq('user_id', profile.id);
            if (!error && data) {
                setUserDocs(data);
            }
        } catch (e) {
            console.error("Failed to fetch documents:", e);
        }
    };

    useEffect(() => {
        fetchDocs();
    }, [profile?.id]);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setNickname(profile.nickname || '');
            setBirthday((profile as any).birth_date || profile.birthday || '');
            setNik(profile.nik || (profile as any).id_number || '');
            setPersonalEmail(profile.social_links?.personal_email || '');
            setWhatsapp(profile.social_links?.whatsapp || profile.phone || '');
            setPhoneNumber(profile.social_links?.phone_number || '');
            const pa = parseAddr(profile.address);
            setCurrentAddress(pa.current || '');
            setKtpAddress(pa.ktp || '');
            setEmergencyName(profile.emergency_contact?.name || '');
            setEmergencyRelationship(profile.emergency_contact?.relationship || '');
            setEmergencyPhone(profile.emergency_contact?.phone || '');
            setLinkedin(profile.social_links?.linkedin || '');
            setInstagram(profile.social_links?.instagram || '');
            setExtraSocials(profile.social_links?.extra_links || []);

            const bName = profile.bank_info?.bank_name || '';
            const isStandardBank = BANK_OPTIONS.some(b => b.id === bName || b.label === bName);
            if (bName && !isStandardBank) {
                setBankName('Other');
                setCustomBankName(bName);
            } else {
                setBankName(bName);
                setCustomBankName('');
            }
            setAccountNumber(profile.bank_info?.account_number || '');
            setAccountHolder(profile.bank_info?.account_holder || '');
        }
    }, [profile]);

    const hasUnsavedChanges = () => {
        if (!activeSection) return false;
        if (activeSection === 'Identity') {
            return fullName !== (profile?.full_name || '') ||
                nickname !== (profile?.nickname || '') ||
                birthday !== ((profile as any)?.birth_date || profile?.birthday || '') ||
                nik !== (profile?.nik || (profile as any)?.id_number || '');
        }
        if (activeSection === 'Contact') {
            return personalEmail.trim().toLowerCase() !== (profile?.social_links?.personal_email?.toLowerCase() || '') ||
                whatsapp.trim() !== (profile?.social_links?.whatsapp || profile?.phone || '') ||
                phoneNumber.trim() !== (profile?.social_links?.phone_number || '');
        }
        if (activeSection === 'Address') {
            const pa = parseAddr(profile?.address);
            return currentAddress !== (pa.current || '') ||
                ktpAddress !== (pa.ktp || '');
        }
        if (activeSection === 'Emergency Contact') {
            return emergencyName !== (profile?.emergency_contact?.name || '') ||
                emergencyRelationship !== (profile?.emergency_contact?.relationship || '') ||
                emergencyPhone !== (profile?.emergency_contact?.phone || '');
        }
        if (activeSection === 'Social') {
            return linkedin !== (profile?.social_links?.linkedin || '') ||
                instagram !== (profile?.social_links?.instagram || '') ||
                JSON.stringify(extraSocials) !== JSON.stringify(profile?.social_links?.extra_links || []);
        }
        if (activeSection === 'Finance') {
            const effectiveBank = bankName === 'Other' ? customBankName : bankName;
            return effectiveBank !== (profile?.bank_info?.bank_name || '') ||
                accountNumber !== (profile?.bank_info?.account_number || '') ||
                accountHolder !== (profile?.bank_info?.account_holder || '');
        }
        return false;
    };

    const prepopulateFields = (section: string) => {
        if (section === 'Identity') {
            setFullName(profile?.full_name || '');
            setNickname(profile?.nickname || '');
            setBirthday((profile as any)?.birth_date || profile?.birthday || '');
            const rawGen = (profile as any)?.gender;
            setGender(rawGen === 'Female' ? 'Female' : rawGen === 'Not Specified' ? 'Not Specified' : 'Male');
            setNik(profile?.nik || (profile as any)?.id_number || '');
        } else if (section === 'Contact') {
            setPersonalEmail(profile?.social_links?.personal_email || '');
            setWhatsapp(profile?.social_links?.whatsapp || profile?.phone || '');
            setPhoneNumber(profile?.social_links?.phone_number || '');
        } else if (section === 'Address') {
            const pa = parseAddr(profile?.address);
            setCurrentAddress(pa.current || '');
            setKtpAddress(pa.ktp || '');
        } else if (section === 'Emergency Contact') {
            setEmergencyName(profile?.emergency_contact?.name || '');
            setEmergencyRelationship(profile?.emergency_contact?.relationship || '');
            setEmergencyPhone(profile?.emergency_contact?.phone || '');
        } else if (section === 'Social') {
            setLinkedin(profile?.social_links?.linkedin || '');
            setInstagram(profile?.social_links?.instagram || '');
            setExtraSocials(profile?.social_links?.extra_links || []);
        } else if (section === 'Finance') {
            const bName = profile?.bank_info?.bank_name || '';
            const isStandardBank = BANK_OPTIONS.some(b => b.id === bName || b.label === bName);
            if (bName && !isStandardBank) {
                setBankName('Other');
                setCustomBankName(bName);
            } else {
                setBankName(bName);
                setCustomBankName('');
            }
            setAccountNumber(profile?.bank_info?.account_number || '');
            setAccountHolder(profile?.bank_info?.account_holder || '');
        }
    };

    const toggleEditSection = (section: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (activeSection === section) {
            prepopulateFields(section);
            setActiveSection(null);
            return;
        }

        if (activeSection && activeSection !== section && hasUnsavedChanges()) {
            Alert.alert(
                'Discard Changes?',
                'You have unsaved changes in another section. Discard them to edit this section?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => {
                            setActiveSection(section);
                            prepopulateFields(section);
                        }
                    }
                ]
            );
            return;
        }

        setActiveSection(section);
        prepopulateFields(section);
    };

    const handleCancel = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (activeSection) {
            prepopulateFields(activeSection);
        }
        setActiveSection(null);
    };

    const handleSaveSection = async () => {
        if (!profile?.id) return;
        setSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            let updates: any = {};
            if (activeSection === 'Identity') {
                if (!fullName.trim()) {
                    Alert.alert('Validation Error', 'Full Name is required.');
                    setSaving(false);
                    return;
                }
                if (nik.trim() && nik.trim().length !== 16) {
                    Alert.alert('Validation Error', 'NIK (National ID) must be exactly 16 numeric digits.');
                    setSaving(false);
                    return;
                }
                updates = {
                    full_name: fullName.trim(),
                    nickname: nickname.trim() || null,
                    birth_date: birthday.trim() || null,
                    nik: nik.trim() || null,
                    id_number: nik.trim() || null,
                };
            } else if (activeSection === 'Contact') {
                updates = {
                    phone: whatsapp.trim() || phoneNumber.trim() || null,
                    social_links: {
                        ...profile.social_links,
                        personal_email: personalEmail.trim().toLowerCase() || null,
                        whatsapp: whatsapp.trim() || null,
                        phone_number: phoneNumber.trim() || null,
                    }
                };
            } else if (activeSection === 'Address') {
                updates = {
                    address: {
                        current: currentAddress.trim() || null,
                        ktp: ktpAddress.trim() || null,
                    }
                };
            } else if (activeSection === 'Emergency Contact') {
                updates = {
                    emergency_contact: {
                        name: emergencyName.trim() || null,
                        relationship: emergencyRelationship.trim() || null,
                        phone: emergencyPhone.trim() || null,
                    }
                };
            } else if (activeSection === 'Social') {
                updates = {
                    social_links: {
                        ...profile.social_links,
                        linkedin: linkedin.trim() || null,
                        instagram: instagram.trim() || null,
                        extra_links: extraSocials,
                    }
                };
            } else if (activeSection === 'Finance') {
                const effectiveBank = bankName === 'Other' ? customBankName.trim() : bankName.trim();

                // Bank account number validation
                if (selectedBank && accountNumber.trim()) {
                    const digits = selectedBank.digits;
                    if (typeof digits === 'number' && accountNumber.trim().length !== digits) {
                        Alert.alert('Validation Error', `${selectedBank.label} account number must be ${digits} digits.`);
                        setSaving(false);
                        return;
                    } else if (Array.isArray(digits) && (accountNumber.trim().length < digits[0] || accountNumber.trim().length > digits[1])) {
                        Alert.alert('Validation Error', `${selectedBank.label} account number must be between ${digits[0]} and ${digits[1]} digits.`);
                        setSaving(false);
                        return;
                    }
                }

                updates = {
                    bank_info: {
                        bank_name: effectiveBank || null,
                        account_number: accountNumber.trim() || null,
                        account_holder: accountHolder.trim() || null,
                    }
                };
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', profile.id);

            if (error) throw error;
            await refreshProfile();
            setActiveSection(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Profile section updated successfully.');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to update section');
        } finally {
            setSaving(false);
        }
    };

    // Native Dropdown Handlers
    const showRelationshipMenu = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const options = ['Cancel', ...RELATIONSHIP_OPTIONS];
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 0,
                    title: 'Select Relationship',
                },
                (buttonIndex) => {
                    if (buttonIndex > 0) {
                        setEmergencyRelationship(RELATIONSHIP_OPTIONS[buttonIndex - 1]);
                    }
                }
            );
        } else {
            Alert.alert(
                'Select Relationship',
                undefined,
                options.map((opt, idx) => ({
                    text: opt,
                    style: idx === 0 ? 'cancel' : 'default',
                    onPress: () => {
                        if (idx > 0) setEmergencyRelationship(RELATIONSHIP_OPTIONS[idx - 1]);
                    }
                }))
            );
        }
    };

    const showBankMenu = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const bankLabels = BANK_OPTIONS.map(b => b.label);
        const options = ['Cancel', ...bankLabels];
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 0,
                    title: 'Select Bank',
                },
                (buttonIndex) => {
                    if (buttonIndex > 0) {
                        const chosen = BANK_OPTIONS[buttonIndex - 1];
                        if (chosen.id === 'Other') {
                            setBankName('Other');
                        } else {
                            setBankName(chosen.id);
                            setCustomBankName('');
                        }
                    }
                }
            );
        } else {
            Alert.alert(
                'Select Bank',
                undefined,
                options.map((opt, idx) => ({
                    text: opt,
                    style: idx === 0 ? 'cancel' : 'default',
                    onPress: () => {
                        if (idx > 0) {
                            const chosen = BANK_OPTIONS[idx - 1];
                            if (chosen.id === 'Other') {
                                setBankName('Other');
                            } else {
                                setBankName(chosen.id);
                                setCustomBankName('');
                            }
                        }
                    }
                }))
            );
        }
    };

    const showAddSocialMenu = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const available = SOCIAL_PLATFORMS.filter(
            p => !extraSocials.some(s => s.platform === p.id)
        );
        if (available.length === 0) {
            Alert.alert('Info', 'All available social platforms have been added.');
            return;
        }
        const options = ['Cancel', ...available.map(p => p.label)];
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 0,
                    title: 'Add Social Platform',
                },
                (buttonIndex) => {
                    if (buttonIndex > 0) {
                        const chosen = available[buttonIndex - 1];
                        setExtraSocials(prev => [...prev, { platform: chosen.id, value: '' }]);
                    }
                }
            );
        } else {
            Alert.alert(
                'Add Social Platform',
                undefined,
                options.map((opt, idx) => ({
                    text: opt,
                    style: idx === 0 ? 'cancel' : 'default',
                    onPress: () => {
                        if (idx > 0) {
                            const chosen = available[idx - 1];
                            setExtraSocials(prev => [...prev, { platform: chosen.id, value: '' }]);
                        }
                    }
                }))
            );
        }
    };

    // Social Media Link Click Resolver
    const handleSocialPress = async (platform: string, rawVal: string) => {
        if (!rawVal) return;
        let url = rawVal.trim();
        if (platform.toLowerCase() === 'linkedin') {
            const clean = url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '').replace(/^in\//i, '');
            url = `https://www.linkedin.com/in/${clean}`;
        } else if (platform.toLowerCase() === 'instagram') {
            const clean = url.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/i, '');
            url = `https://www.instagram.com/${clean}`;
        } else if (platform.toLowerCase() === 'x' || platform.toLowerCase().includes('twitter')) {
            const clean = url.replace(/^https?:\/\/(www\.)?x\.com\//i, '').replace(/^https?:\/\/(www\.)?twitter\.com\//i, '').replace(/^@/i, '');
            url = `https://x.com/${clean}`;
        } else if (platform.toLowerCase() === 'facebook') {
            if (!url.startsWith('http')) url = `https://facebook.com/${url}`;
        } else if (platform.toLowerCase() === 'github') {
            const clean = url.replace(/^https?:\/\/(www\.)?github\.com\//i, '');
            url = `https://github.com/${clean}`;
        } else if (platform.toLowerCase() === 'tiktok') {
            const clean = url.replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, '').replace(/^@/i, '');
            url = `https://tiktok.com/@${clean}`;
        } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
        }

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Cannot Open Link', `Could not navigate to ${url}`);
            }
        } catch (e) {
            Alert.alert('Error', 'Unable to open link in browser.');
        }
    };

    const handleUploadDoc = async (category: string) => {
        if (!profile?.id) return;

        const isPasFoto = category === 'Pas Foto' || category === 'Pas Foto (Profile Photo)';

        const pickAndUpload = async (sourceType: 'camera' | 'gallery' | 'document') => {
            try {
                let fileUri = '';
                let fileName = '';
                let mimeType = '';

                if (sourceType === 'camera') {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert('Permission Needed', 'Camera permission is required.');
                        return;
                    }
                    const res = await ImagePicker.launchCameraAsync({
                        allowsEditing: isPasFoto,
                        aspect: isPasFoto ? [1, 1] : undefined,
                        quality: 0.85,
                    });
                    if (res.canceled || !res.assets || res.assets.length === 0) return;
                    fileUri = res.assets[0].uri;
                    fileName = `${category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_photo.jpg`;
                    mimeType = res.assets[0].mimeType || 'image/jpeg';
                } else if (sourceType === 'gallery') {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert('Permission Needed', 'Photo library permission is required.');
                        return;
                    }
                    const res = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: isPasFoto,
                        aspect: isPasFoto ? [1, 1] : undefined,
                        quality: 0.85,
                    });
                    if (res.canceled || !res.assets || res.assets.length === 0) return;
                    fileUri = res.assets[0].uri;
                    fileName = res.assets[0].fileName || `${category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.jpg`;
                    mimeType = res.assets[0].mimeType || 'image/jpeg';
                } else {
                    const res = await DocumentPicker.getDocumentAsync({
                        type: ['application/pdf', 'image/*'],
                        copyToCacheDirectory: true,
                    });
                    if (res.canceled || !res.assets || res.assets.length === 0) return;
                    fileUri = res.assets[0].uri;
                    fileName = res.assets[0].name;
                    mimeType = res.assets[0].mimeType || 'application/pdf';
                }

                setUploadingDoc(category);

                const base64Data = await FileSystem.readAsStringAsync(fileUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                const fileExt = fileName.split('.').pop() || (mimeType.includes('pdf') ? 'pdf' : 'jpg');
                const safeCategory = category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                const storagePath = `${profile.id}/${safeCategory}-${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('profile_documents')
                    .upload(storagePath, decode(base64Data), {
                        contentType: mimeType || 'application/octet-stream',
                        upsert: true,
                    });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('profile_documents')
                    .getPublicUrl(storagePath);

                const { data: existingDocs } = await supabase
                    .from('user_documents')
                    .select('id')
                    .eq('user_id', profile.id)
                    .eq('document_type', category);

                const docTitle = isPasFoto ? 'Pas Foto (Profile Photo)' : fileName;

                if (existingDocs && existingDocs.length > 0) {
                    const { error: updateError } = await supabase
                        .from('user_documents')
                        .update({
                            title: docTitle,
                            file_url: publicUrlData.publicUrl,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', existingDocs[0].id);
                    if (updateError) throw updateError;
                } else {
                    const { error: insertError } = await supabase
                        .from('user_documents')
                        .insert({
                            user_id: profile.id,
                            title: docTitle,
                            document_type: category,
                            file_url: publicUrlData.publicUrl,
                        });
                    if (insertError) throw insertError;
                }

                if (isPasFoto) {
                    await supabase
                        .from('profiles')
                        .update({ avatar_url: publicUrlData.publicUrl })
                        .eq('id', profile.id);
                }

                await fetchDocs();
                await refreshProfile();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', `${category} uploaded successfully.`);
            } catch (e: any) {
                Alert.alert('Upload Failed', e.message || 'Could not upload document.');
            } finally {
                setUploadingDoc(null);
            }
        };

        if (Platform.OS === 'ios') {
            const options = isPasFoto
                ? ['Cancel', 'Take Photo', 'Photo Library']
                : ['Cancel', 'Take Photo', 'Photo Library', 'Browse Files'];
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: `Upload ${category}`,
                    options,
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) pickAndUpload('camera');
                    else if (buttonIndex === 2) pickAndUpload('gallery');
                    else if (buttonIndex === 3) pickAndUpload('document');
                }
            );
        } else {
            const buttons: any[] = [
                { text: 'Take Photo', onPress: () => pickAndUpload('camera') },
                { text: 'Photo Library', onPress: () => pickAndUpload('gallery') },
            ];
            if (!isPasFoto) {
                buttons.push({ text: 'Browse Files', onPress: () => pickAndUpload('document') });
            }
            buttons.push({ text: 'Cancel', style: 'cancel' });
            Alert.alert(`Upload ${category}`, undefined, buttons);
        }
    };

    const promptAddOtherDocument = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (Platform.OS === 'web') {
            const title = typeof window !== 'undefined' ? window.prompt('Enter document title (e.g. Passport, Police Record, Certificate):') : null;
            if (title && title.trim()) {
                handleUploadDoc(title.trim());
            }
        } else if (Platform.OS === 'ios' && (Alert as any).prompt) {
            (Alert as any).prompt(
                'Add Other Document',
                'Enter document title (e.g. Passport, Police Record, Certificate):',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Choose File',
                        onPress: (text?: string) => {
                            if (text && text.trim()) {
                                handleUploadDoc(text.trim());
                            } else {
                                Alert.alert('Validation Error', 'Please enter a document title.');
                            }
                        }
                    }
                ],
                'plain-text',
                '',
                'default'
            );
        } else {
            handleUploadDoc('Other Document');
        }
    };

    const handleViewDoc = async (url: string) => {
        try {
            await WebBrowser.openBrowserAsync(url);
        } catch {
            Linking.openURL(url).catch(() => {
                Alert.alert('Error', 'Unable to open document.');
            });
        }
    };

    const handleDownloadDoc = async (url: string, title: string) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const safeTitle = (title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
            const cleanUrl = url.split('?')[0];
            const ext = cleanUrl.split('.').pop() || 'pdf';
            const localUri = `${FileSystem.cacheDirectory}${safeTitle}-${Date.now()}.${ext}`;

            const downloadRes = await FileSystem.downloadAsync(url, localUri);
            if (downloadRes.status === 200) {
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(downloadRes.uri, {
                        UTI: ext === 'pdf' ? 'com.adobe.pdf' : 'public.item',
                        dialogTitle: `Download / Save ${title}`,
                    });
                } else {
                    Alert.alert('Downloaded', `File saved to ${downloadRes.uri}`);
                }
            } else {
                throw new Error('Failed to download file.');
            }
        } catch (e: any) {
            Alert.alert('Download Failed', e.message || 'Could not download document.');
        }
    };

    const handleDeleteDoc = async (docId: string, category: string) => {
        if (!profile?.id) return;
        Alert.alert(
            'Remove Document',
            `Are you sure you want to remove "${category}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('user_documents')
                                .delete()
                                .eq('id', docId);

                            if (error) throw error;

                            if (category === 'Pas Foto' || category === 'Pas Foto (Profile Photo)') {
                                await supabase
                                    .from('profiles')
                                    .update({ avatar_url: null })
                                    .eq('id', profile.id);
                                await refreshProfile();
                            }

                            await fetchDocs();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert('Success', `${category} removed successfully.`);
                        } catch (e: any) {
                            Alert.alert('Error', e.message || 'Failed to remove document.');
                        }
                    }
                }
            ]
        );
    };

    const handleDocPress = (doc: any, category: string, title: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(
            title,
            `${doc.title || doc.name || 'Document'}\nUploaded: ${new Date(doc.updated_at || doc.created_at || Date.now()).toLocaleDateString()}`,
            [
                {
                    text: 'View / Preview',
                    onPress: () => {
                        if (doc.file_url) handleViewDoc(doc.file_url);
                    }
                },
                {
                    text: 'Download / Save',
                    onPress: () => {
                        if (doc.file_url) handleDownloadDoc(doc.file_url, doc.title || doc.name || title);
                    }
                },
                {
                    text: 'Change / Replace',
                    onPress: () => handleUploadDoc(category)
                },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => handleDeleteDoc(doc.id, title)
                },
                {
                    text: 'Cancel',
                    style: 'cancel'
                }
            ]
        );
    };

    const renderHeader = (title: string, showEdit = true) => {
        const isEditing = activeSection === title;
        return (
            <View style={s.sectionHeader}>
                <View style={s.sectionHeaderText}>
                    <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>{title}</Text>
                </View>
                {showEdit && (
                    Platform.OS === 'ios' && SwiftUIHost && SwiftUIButton && SwiftUIText && swiftModifiers ? (
                        <View style={{ height: 22, width: 64 }}>
                            <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                <SwiftUIButton
                                    onPress={() => toggleEditSection(title)}
                                    controlSize="mini"
                                    variant="glassProminent"
                                    color="#007AFF"
                                >
                                    <SwiftUIText size={11} weight="semibold" color="#FFFFFF">
                                        {isEditing ? 'Cancel' : 'Edit'}
                                    </SwiftUIText>
                                </SwiftUIButton>
                            </SwiftUIHost>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[
                                s.editButtonGlass,
                                {
                                    backgroundColor: isDark ? 'rgba(10, 132, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)',
                                    borderColor: isDark ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0, 122, 255, 0.18)'
                                }
                            ]}
                            onPress={() => toggleEditSection(title)}
                            activeOpacity={0.7}
                        >
                            <Text style={[s.editTextGlass, { color: isDark ? '#409CFF' : '#007AFF' }]}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                        </TouchableOpacity>
                    )
                )}
            </View>
        );
    };

    const renderFormRow = (
        section: string,
        label: string,
        value: string,
        onChangeText: (text: string) => void,
        icon?: string,
        isLast = false,
        keyboardType: any = 'default',
        placeholder = '',
        maxLength?: number,
        autoCapitalize: any = 'sentences'
    ) => {
        const isEditing = activeSection === section;
        return (
            <View key={label}>
                <View style={s.formRow}>
                    <View style={s.rowLeft}>
                        {icon && <PlatformIcon name={icon} size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />}
                        <Text style={[s.rowLabel, { color: textColor }]}>{label}</Text>
                    </View>
                    {isEditing ? (
                        <TextInput
                            style={[
                                s.seamlessInput,
                                { color: textColor }
                            ]}
                            value={value}
                            onChangeText={onChangeText}
                            keyboardType={keyboardType}
                            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
                            placeholderTextColor={subtextColor}
                            maxLength={maxLength}
                            autoCapitalize={autoCapitalize}
                            autoCorrect={false}
                            selectionColor="#007AFF"
                        />
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', alignItems: 'center' }}
                            style={{ flex: 1, marginLeft: 12 }}
                        >
                            <Text
                                style={{
                                    color: subtextColor,
                                    fontSize: 15,
                                    fontWeight: '400',
                                    textAlign: 'right'
                                }}
                                numberOfLines={1}
                                selectable
                            >
                                {value || '—'}
                            </Text>
                        </ScrollView>
                    )}
                </View>
                {!isLast && <View style={[s.separator, { backgroundColor: borderColor }]} />}
            </View>
        );
    };

    const renderDocCard = (category: string, title: string) => {
        const doc = userDocs.find(d => (d.document_type || d.category) === category);
        const isUploading = uploadingDoc === category;
        const isPasFoto = category === 'Pas Foto';
        const hasThumbnail = doc && (isPasFoto || /\.(jpg|jpeg|png|webp|gif)/i.test(doc.file_url));

        return (
            <TouchableOpacity
                key={category}
                activeOpacity={0.8}
                onPress={() => {
                    if (doc) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedDoc({
                            id: doc.id,
                            title: doc.title || doc.name || title,
                            category: title,
                            file_url: doc.file_url,
                            created_at: doc.created_at,
                            updated_at: doc.updated_at,
                        });
                    } else {
                        handleUploadDoc(category);
                    }
                }}
            >
                <GlassView
                    intensity={intensity}
                    style={[
                        s.docCardItem,
                        {
                            backgroundColor: bgColor,
                            borderColor: borderColor,
                        }
                    ]}
                >
                    {/* Left Thumbnail / Icon */}
                    <View style={s.docThumbnailBox}>
                        {hasThumbnail ? (
                            <Image
                                source={{ uri: doc.file_url }}
                                style={s.docThumbnailImg}
                                contentFit="cover"
                                transition={200}
                            />
                        ) : (
                            <View
                                style={[
                                    s.docIconWrap,
                                    {
                                        backgroundColor: doc
                                            ? (isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)')
                                            : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
                                    }
                                ]}
                            >
                                <PlatformIcon
                                    name={isPasFoto ? 'person.crop.square.fill' : 'doc.text.fill'}
                                    size={20}
                                    tintColor={doc ? '#007AFF' : subtextColor}
                                />
                            </View>
                        )}
                    </View>

                    {/* Middle Info */}
                    <View style={{ flex: 1, justifyContent: 'center', gap: 2 }}>
                        <Text style={[s.docCardTitle, { color: textColor }]} numberOfLines={1}>{title}</Text>
                        <Text style={[s.docCardSub, { color: subtextColor }]} numberOfLines={1}>
                            {doc
                                ? `Uploaded • ${new Date(doc.created_at || doc.updated_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                                : 'Not uploaded yet'}
                        </Text>
                    </View>

                    {/* Right Action */}
                    {!doc && (
                        <View style={{ marginLeft: 8 }}>
                            <BouncyAddButton
                                isDark={isDark}
                                isUploading={isUploading}
                                onPress={() => handleUploadDoc(category)}
                            />
                        </View>
                    )}
                </GlassView>
            </TouchableOpacity>
        );
    };

    const hasChanges = hasUnsavedChanges();

    // Parse birthday string into valid Date object
    const getBirthdayDate = () => {
        if (birthday && !isNaN(new Date(birthday).getTime())) {
            return new Date(birthday);
        }
        return new Date(2000, 0, 1);
    };

    // Default static document categories
    const defaultDocCategories = ['Pas Foto', 'KTP', 'NPWP', 'CV', 'Diploma', 'Transcript'];
    const defaultDocsMeta = [
        { category: 'Pas Foto', title: 'Pas Foto (Profile Photo)' },
        { category: 'KTP', title: 'KTP (ID Card)' },
        { category: 'NPWP', title: 'NPWP (Tax ID)' },
        { category: 'CV', title: 'CV / Resume' },
        { category: 'Diploma', title: 'Latest Diploma' },
        { category: 'Transcript', title: 'Latest Transcript' },
    ];

    // Find custom uploaded docs that aren't part of the default categories
    const customDocs = userDocs.filter(d => !defaultDocCategories.includes(d.document_type || d.category));

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
        >
            <ScrollView
                style={[s.container, { backgroundColor: isDark ? '#000' : '#F2F2F7' }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: insets.bottom + 90,
                    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 16 : 16,
                    gap: 24,
                }}
                showsVerticalScrollIndicator={false}
            >
                <Stack.Screen
                    options={{
                        headerShown: true,
                        title: 'Identity',
                        headerLargeTitle: false,
                        headerTransparent: Platform.OS === 'ios',
                        headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                        headerTintColor: textColor,
                        headerTitleStyle: { color: textColor, fontWeight: '600' },
                        headerShadowVisible: false,
                        headerBackButtonDisplayMode: 'minimal',
                        headerBackTitle: ' ',
                    }}
                />

                <View style={{ gap: 24 }}>

                    {/* 1. IDENTITY SECTION */}
                    <View style={s.section}>
                        {renderHeader('Identity')}
                        <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>
                            {renderFormRow('Identity', 'Full Name', fullName, setFullName, 'person', false, 'default', 'Enter full name')}
                            {renderFormRow('Identity', 'Nickname', nickname, setNickname, 'at', false, 'default', 'Enter nickname')}

                            {/* Birth Date with Native DatePicker (date only, no time) */}
                            <View style={s.formRow}>
                                <View style={s.rowLeft}>
                                    <PlatformIcon name="calendar" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                    <Text style={[s.rowLabel, { color: textColor }]}>Birth Date</Text>
                                </View>
                                {activeSection === 'Identity' ? (
                                    <DateTimePicker
                                        value={getBirthdayDate()}
                                        mode="date"
                                        display="compact"
                                        themeVariant={isDark ? 'dark' : 'light'}
                                        maximumDate={new Date()}
                                        onChange={(event, selectedDate) => {
                                            if (selectedDate) {
                                                const yyyy = selectedDate.getFullYear();
                                                const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                                                const dd = String(selectedDate.getDate()).padStart(2, '0');
                                                setBirthday(`${yyyy}-${mm}-${dd}`);
                                            }
                                        }}
                                    />
                                ) : (
                                    <Text style={[s.rowValue, { color: subtextColor, textAlign: 'right' }]}>
                                        {birthday || (profile as any)?.birth_date || profile?.birthday || '—'}
                                    </Text>
                                )}
                            </View>
                            <View style={[s.separator, { backgroundColor: borderColor }]} />

                            {/* Gender Field */}
                            <View style={s.formRow}>
                                <View style={s.rowLeft}>
                                    <PlatformIcon name="person.2" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                    <Text style={[s.rowLabel, { color: textColor }]}>Gender</Text>
                                </View>
                                {activeSection === 'Identity' ? (
                                    (profile as any)?.account_type === 'system' ? (
                                        <Text style={[s.rowValue, { color: subtextColor }]}>Not Specified (System)</Text>
                                    ) : Platform.OS === 'ios' && SwiftUIHost && SwiftUIPicker && SwiftUIHStack && SwiftUISpacer ? (
                                        <View style={{ flex: 1, height: 34, alignItems: 'flex-end', justifyContent: 'center' }}>
                                            <SwiftUIHost style={{ width: '100%', height: 34 }} colorScheme={isDark ? 'dark' : 'light'}>
                                                <SwiftUIHStack>
                                                    <SwiftUISpacer />
                                                    <SwiftUIPicker
                                                        options={['Male', 'Female']}
                                                        selectedIndex={gender === 'Female' ? 1 : 0}
                                                        onOptionSelected={(e: any) => {
                                                            const idx = e.nativeEvent.index;
                                                            setGender(idx === 1 ? 'Female' : 'Male');
                                                        }}
                                                        variant="menu"
                                                        color="#007AFF"
                                                    />
                                                </SwiftUIHStack>
                                            </SwiftUIHost>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => {
                                                Alert.alert('Select Gender', undefined, [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { text: 'Male', onPress: () => setGender('Male') },
                                                    { text: 'Female', onPress: () => setGender('Female') },
                                                ]);
                                            }}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={{ color: '#007AFF', fontSize: 15, fontWeight: '500' }}>
                                                {gender || 'Male'}
                                            </Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor="#007AFF" />
                                        </TouchableOpacity>
                                    )
                                ) : (
                                    <Text style={[s.rowValue, { color: subtextColor, textAlign: 'right' }]}>
                                        {(profile as any)?.gender || gender || '—'}
                                    </Text>
                                )}
                            </View>
                            <View style={[s.separator, { backgroundColor: borderColor }]} />

                            {/* NIK (National ID) - 16 numeric digits max */}
                            {renderFormRow(
                                'Identity',
                                'NIK (National ID)',
                                nik,
                                (text) => setNik(text.replace(/[^0-9]/g, '').slice(0, 16)),
                                'person.text.rectangle',
                                true,
                                'number-pad',
                                '16-digit NIK',
                                16
                            )}
                        </GlassView>
                    </View>

                    {/* 2. CONTACT SECTION */}
                    <View style={s.section}>
                        {renderHeader('Contact')}
                        <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>
                            {/* Email (Work) - Strictly Read-Only */}
                            <View style={s.formRow}>
                                <View style={s.rowLeft}>
                                    <PlatformIcon name="envelope" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                    <Text style={[s.rowLabel, { color: textColor }]}>Email (Work)</Text>
                                </View>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', alignItems: 'center' }}
                                    style={{ flex: 1, marginLeft: 12 }}
                                >
                                    <Text
                                        style={{
                                            color: subtextColor,
                                            fontSize: 15,
                                            fontWeight: '400',
                                            textAlign: 'right'
                                        }}
                                        numberOfLines={1}
                                        selectable
                                    >
                                        {profile?.email || '—'}
                                    </Text>
                                </ScrollView>
                            </View>
                            <View style={[s.separator, { backgroundColor: borderColor }]} />

                            {renderFormRow('Contact', 'Personal Email', personalEmail, (t) => setPersonalEmail(t.toLowerCase()), 'envelope', false, 'email-address', 'Personal email', undefined, 'none')}
                            {renderFormRow('Contact', 'WhatsApp', whatsapp, setWhatsapp, 'whatsapp', false, 'phone-pad', 'WhatsApp number')}
                            {renderFormRow('Contact', 'Phone Number', phoneNumber, setPhoneNumber, 'phone', true, 'phone-pad', 'Phone number')}
                        </GlassView>
                    </View>

                    {/* 3. ADDRESS SECTION */}
                    <View style={s.section}>
                        {renderHeader('Address')}
                        <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>
                            <View style={s.addressBlock}>
                                <Text style={[s.detailLabel, { color: subtextColor }]}>Current Address</Text>
                                {activeSection === 'Address' ? (
                                    <TextInput
                                        style={[
                                            s.textarea,
                                            {
                                                color: textColor,
                                                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                                marginTop: 8
                                            }
                                        ]}
                                        value={currentAddress}
                                        onChangeText={setCurrentAddress}
                                        placeholder="Enter current residential address"
                                        placeholderTextColor={subtextColor}
                                        multiline
                                        numberOfLines={3}
                                    />
                                ) : (
                                    <Text style={[s.addressValue, { color: textColor, marginTop: 6, lineHeight: 20 }]}>
                                        {currentAddress || parseAddr(profile?.address).current || '—'}
                                    </Text>
                                )}
                            </View>
                            <View style={[s.separator, { backgroundColor: borderColor, marginLeft: 16 }]} />

                            <View style={s.addressBlock}>
                                <Text style={[s.detailLabel, { color: subtextColor }]}>Home Address (KTP)</Text>
                                {activeSection === 'Address' ? (
                                    <TextInput
                                        style={[
                                            s.textarea,
                                            {
                                                color: textColor,
                                                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                                marginTop: 8
                                            }
                                        ]}
                                        value={ktpAddress}
                                        onChangeText={setKtpAddress}
                                        placeholder="Enter KTP registered address"
                                        placeholderTextColor={subtextColor}
                                        multiline
                                        numberOfLines={3}
                                    />
                                ) : (
                                    <Text style={[s.addressValue, { color: textColor, marginTop: 6, lineHeight: 20 }]}>
                                        {ktpAddress || parseAddr(profile?.address).ktp || '—'}
                                    </Text>
                                )}
                            </View>
                        </GlassView>
                    </View>

                    {/* 4. EMERGENCY CONTACT SECTION (Native Dropdown Relationship) */}
                    <View style={s.section}>
                        {renderHeader('Emergency Contact')}
                        <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>
                            {renderFormRow('Emergency Contact', 'Name', emergencyName, setEmergencyName, 'person', false, 'default', 'Contact name')}

                            {/* Relationship Dropdown Row */}
                            <View style={s.formRow}>
                                <View style={s.rowLeft}>
                                    <PlatformIcon name="person.2" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                    <Text style={[s.rowLabel, { color: textColor }]}>Relationship</Text>
                                </View>
                                {activeSection === 'Emergency Contact' ? (
                                    Platform.OS === 'ios' && SwiftUIHost && SwiftUIPicker && SwiftUIHStack && SwiftUISpacer ? (
                                        <View style={{ flex: 1, height: 34, alignItems: 'flex-end', justifyContent: 'center' }}>
                                            <SwiftUIHost style={{ width: '100%', height: 34 }} colorScheme={isDark ? 'dark' : 'light'}>
                                                <SwiftUIHStack>
                                                    <SwiftUISpacer />
                                                    <SwiftUIPicker
                                                        options={['Select', ...RELATIONSHIP_OPTIONS]}
                                                        selectedIndex={emergencyRelationship ? RELATIONSHIP_OPTIONS.indexOf(emergencyRelationship) + 1 : 0}
                                                        onOptionSelected={(e: any) => {
                                                            const idx = e.nativeEvent.index;
                                                            if (idx === 0) {
                                                                setEmergencyRelationship('');
                                                            } else {
                                                                setEmergencyRelationship(RELATIONSHIP_OPTIONS[idx - 1]);
                                                            }
                                                        }}
                                                        variant="menu"
                                                        color={textColor}
                                                    />
                                                </SwiftUIHStack>
                                            </SwiftUIHost>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={showRelationshipMenu}
                                            style={s.pickerRowRight}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[s.rowValue, { color: emergencyRelationship ? textColor : subtextColor, textAlign: 'right' }]} numberOfLines={1}>
                                                {emergencyRelationship || 'Select'}
                                            </Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} />
                                        </TouchableOpacity>
                                    )
                                ) : (
                                    <Text style={[s.rowValue, { color: emergencyRelationship ? textColor : subtextColor, textAlign: 'right' }]} numberOfLines={1}>
                                        {emergencyRelationship || '—'}
                                    </Text>
                                )}
                            </View>
                            <View style={[s.separator, { backgroundColor: borderColor }]} />

                            {renderFormRow('Emergency Contact', 'Phone', emergencyPhone, setEmergencyPhone, 'phone', true, 'phone-pad', 'Phone number')}
                        </GlassView>
                    </View>

                    {/* 5. SOCIAL MEDIA SECTION (Auto-link opener, lower-case default, extra socials) */}
                    <View style={s.section}>
                        {renderHeader('Social')}
                        <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>

                            {/* LinkedIn Row */}
                            <View style={s.formRow}>
                                <View style={s.rowLeft}>
                                    <PlatformIcon name="link" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                    <Text style={[s.rowLabel, { color: textColor }]}>LinkedIn</Text>
                                </View>
                                {activeSection === 'Social' ? (
                                    <TextInput
                                        style={[s.seamlessInput, { color: textColor }]}
                                        value={linkedin}
                                        onChangeText={setLinkedin}
                                        placeholder="in/username or URL"
                                        placeholderTextColor={subtextColor}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        selectionColor="#007AFF"
                                    />
                                ) : (
                                    <TouchableOpacity
                                        disabled={!linkedin}
                                        onPress={() => handleSocialPress('linkedin', linkedin)}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                    >
                                        <Text style={[s.rowValue, { color: linkedin ? '#007AFF' : subtextColor, textAlign: 'right' }]} numberOfLines={1}>
                                            {linkedin ? (linkedin.startsWith('http') ? linkedin : `in/${linkedin.replace(/^in\//, '')}`) : '—'}
                                        </Text>
                                        {linkedin ? <PlatformIcon name="arrow.up.right" size={11} tintColor="#007AFF" /> : null}
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={[s.separator, { backgroundColor: borderColor }]} />

                            {/* Instagram Row (Lower-case default) */}
                            <View style={s.formRow}>
                                <View style={s.rowLeft}>
                                    <PlatformIcon name="link" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                    <Text style={[s.rowLabel, { color: textColor }]}>Instagram</Text>
                                </View>
                                {activeSection === 'Social' ? (
                                    <TextInput
                                        style={[s.seamlessInput, { color: textColor }]}
                                        value={instagram}
                                        onChangeText={(text) => setInstagram(text.toLowerCase())}
                                        placeholder="@username"
                                        placeholderTextColor={subtextColor}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        selectionColor="#007AFF"
                                    />
                                ) : (
                                    <TouchableOpacity
                                        disabled={!instagram}
                                        onPress={() => handleSocialPress('instagram', instagram)}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                    >
                                        <Text style={[s.rowValue, { color: instagram ? '#007AFF' : subtextColor, textAlign: 'right' }]} numberOfLines={1}>
                                            {instagram ? (instagram.startsWith('@') ? instagram : `@${instagram.toLowerCase()}`) : '—'}
                                        </Text>
                                        {instagram ? <PlatformIcon name="arrow.up.right" size={11} tintColor="#007AFF" /> : null}
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Extra Social Profiles */}
                            {extraSocials.map((item, idx) => {
                                const platformMeta = SOCIAL_PLATFORMS.find(p => p.id === item.platform) || { label: item.platform, icon: 'link' };
                                return (
                                    <View key={idx}>
                                        <View style={[s.separator, { backgroundColor: borderColor }]} />
                                        <View style={s.formRow}>
                                            <View style={s.rowLeft}>
                                                <PlatformIcon name={platformMeta.icon as any} size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                                <Text style={[s.rowLabel, { color: textColor }]}>{platformMeta.label}</Text>
                                            </View>
                                            {activeSection === 'Social' ? (
                                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                                    <TextInput
                                                        style={[s.seamlessInput, { color: textColor }]}
                                                        value={item.value}
                                                        onChangeText={(text) => {
                                                            const updated = [...extraSocials];
                                                            updated[idx].value = text;
                                                            setExtraSocials(updated);
                                                        }}
                                                        placeholder="Enter handle or link"
                                                        placeholderTextColor={subtextColor}
                                                        autoCapitalize="none"
                                                        autoCorrect={false}
                                                        selectionColor="#007AFF"
                                                    />
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            setExtraSocials(prev => prev.filter((_, i) => i !== idx));
                                                        }}
                                                        style={{ padding: 4 }}
                                                    >
                                                        <PlatformIcon name="minus.circle.fill" size={16} tintColor="#FF3B30" />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <TouchableOpacity
                                                    disabled={!item.value}
                                                    onPress={() => handleSocialPress(item.platform, item.value)}
                                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                                >
                                                    <Text style={[s.rowValue, { color: item.value ? '#007AFF' : subtextColor, textAlign: 'right' }]} numberOfLines={1}>
                                                        {item.value || '—'}
                                                    </Text>
                                                    {item.value ? <PlatformIcon name="arrow.up.right" size={11} tintColor="#007AFF" /> : null}
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}

                            {/* Add More Social Button (SwiftUI Button when Editing) */}
                            {activeSection === 'Social' && (
                                <>
                                    <View style={[s.separator, { backgroundColor: borderColor }]} />
                                    {Platform.OS === 'ios' && SwiftUIHost && SwiftUIButton && SwiftUIText ? (
                                        <View style={{ height: 38, marginHorizontal: 16, marginVertical: 8 }}>
                                            <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                                <SwiftUIButton
                                                    onPress={showAddSocialMenu}
                                                    controlSize="regular"
                                                    variant="glass"
                                                    color="#007AFF"
                                                >
                                                    <SwiftUIText size={14} weight="semibold" color="#007AFF">
                                                        + Add Social Platform
                                                    </SwiftUIText>
                                                </SwiftUIButton>
                                            </SwiftUIHost>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={[s.formRow, { justifyContent: 'center' }]}
                                            onPress={showAddSocialMenu}
                                            activeOpacity={0.7}
                                        >
                                            <PlatformIcon name="plus.circle.fill" size={16} tintColor="#007AFF" style={{ marginRight: 6 }} />
                                            <Text style={{ color: '#007AFF', fontSize: 14, fontWeight: '600' }}>Add Social Platform</Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}
                        </GlassView>
                    </View>

                    {/* 6. FINANCE SECTION (Bank Dropdown Menu & Digits validation in backend) */}
                    <View style={s.section}>
                        {renderHeader('Finance')}
                        <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>

                            {/* Bank Name Row with Dropdown */}
                            <View style={s.formRow}>
                                <View style={s.rowLeft}>
                                    <PlatformIcon name="building.columns.fill" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                    <Text style={[s.rowLabel, { color: textColor }]}>Bank Name</Text>
                                </View>
                                {activeSection === 'Finance' ? (
                                    Platform.OS === 'ios' && SwiftUIHost && SwiftUIPicker && SwiftUIHStack && SwiftUISpacer ? (
                                        <View style={{ flex: 1, height: 34, alignItems: 'flex-end', justifyContent: 'center' }}>
                                            <SwiftUIHost style={{ width: '100%', height: 34 }} colorScheme={isDark ? 'dark' : 'light'}>
                                                <SwiftUIHStack>
                                                    <SwiftUISpacer />
                                                    <SwiftUIPicker
                                                        options={['Select', ...BANK_OPTIONS.map(b => b.label)]}
                                                        selectedIndex={(() => {
                                                            if (!bankName) return 0;
                                                            const idx = BANK_OPTIONS.findIndex(b => b.id === bankName || b.label === bankName);
                                                            return idx >= 0 ? idx + 1 : 0;
                                                        })()}
                                                        onOptionSelected={(e: any) => {
                                                            const idx = e.nativeEvent.index;
                                                            if (idx === 0) {
                                                                setBankName('');
                                                                setCustomBankName('');
                                                            } else {
                                                                const chosen = BANK_OPTIONS[idx - 1];
                                                                if (chosen.id === 'Other') {
                                                                    setBankName('Other');
                                                                } else {
                                                                    setBankName(chosen.id);
                                                                    setCustomBankName('');
                                                                }
                                                            }
                                                        }}
                                                        variant="menu"
                                                        color={textColor}
                                                    />
                                                </SwiftUIHStack>
                                            </SwiftUIHost>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={showBankMenu}
                                            style={s.pickerRowRight}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[s.rowValue, { color: bankName ? textColor : subtextColor, textAlign: 'right' }]} numberOfLines={1}>
                                                {bankName === 'Other' ? (customBankName || 'Other') : (bankName || 'Select')}
                                            </Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} />
                                        </TouchableOpacity>
                                    )
                                ) : (
                                    <Text style={[s.rowValue, { color: bankName ? textColor : subtextColor, textAlign: 'right' }]} numberOfLines={1}>
                                        {bankName === 'Other' ? (customBankName || 'Other') : (bankName || '—')}
                                    </Text>
                                )}
                            </View>
                            <View style={[s.separator, { backgroundColor: borderColor }]} />

                            {/* If "Other Bank" selected: Custom bank name input */}
                            {bankName === 'Other' && (
                                <>
                                    {renderFormRow('Finance', 'Custom Bank', customBankName, setCustomBankName, 'creditcard', false, 'default', 'Enter custom bank name')}
                                </>
                            )}

                            {/* Account Number (Clean UI, backend validates exact digits, with eye unhide toggle) */}
                            <View style={s.formRow}>
                                <View style={s.rowLeft}>
                                    <PlatformIcon name="creditcard" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                    <Text style={[s.rowLabel, { color: textColor }]}>Account Number</Text>
                                </View>
                                {activeSection === 'Finance' ? (
                                    <TextInput
                                        style={[s.seamlessInput, { color: textColor }]}
                                        value={accountNumber}
                                        onChangeText={(text) => {
                                            const numeric = text.replace(/[^0-9]/g, '');
                                            const maxLen = selectedBank && typeof selectedBank.digits === 'number'
                                                ? selectedBank.digits
                                                : (selectedBank && Array.isArray(selectedBank.digits) ? selectedBank.digits[1] : 20);
                                            setAccountNumber(numeric.slice(0, maxLen));
                                        }}
                                        keyboardType="number-pad"
                                        placeholder="Account number"
                                        placeholderTextColor={subtextColor}
                                        selectionColor="#007AFF"
                                    />
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
                                        <Text style={[s.rowValue, { color: accountNumber ? textColor : subtextColor, letterSpacing: (!showAccountNumber && accountNumber) ? 1.5 : 0 }]} numberOfLines={1}>
                                            {accountNumber
                                                ? (showAccountNumber ? accountNumber : (accountNumber.length > 4 ? `•••• ${accountNumber.slice(-4)}` : accountNumber.replace(/./g, '•')))
                                                : '—'}
                                        </Text>
                                        {accountNumber ? (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setShowAccountNumber(!showAccountNumber);
                                                }}
                                                style={{ marginLeft: 8, padding: 4 }}
                                                activeOpacity={0.7}
                                            >
                                                <PlatformIcon
                                                    name={showAccountNumber ? 'eye.slash' : 'eye'}
                                                    size={15}
                                                    tintColor={subtextColor}
                                                />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                )}
                            </View>
                            <View style={[s.separator, { backgroundColor: borderColor }]} />

                            {renderFormRow('Finance', 'Account Holder', accountHolder, setAccountHolder, 'person', true, 'default', 'Account holder name')}
                        </GlassView>
                    </View>

                    {/* 7. DOCUMENTS SECTION (Individual Cards + Preview Modal) */}
                    <View style={s.section}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                            <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>Documents</Text>
                            <Text style={{ fontSize: 12, fontWeight: '500', color: subtextColor }}>{userDocs.length} Uploaded</Text>
                        </View>

                        <View style={{ gap: 10 }}>
                            {/* Default categories */}
                            {defaultDocsMeta.map((item) => (
                                renderDocCard(item.category, item.title)
                            ))}

                            {/* Custom uploaded documents */}
                            {customDocs.map((doc) => (
                                renderDocCard(doc.document_type || doc.category, doc.title || doc.name || doc.document_type || doc.category)
                            ))}
                        </View>

                        {/* Add Other Document Button */}
                        {Platform.OS === 'ios' && SwiftUIHost && SwiftUIButton && SwiftUIText ? (
                            <View style={{ height: 38, marginTop: 4 }}>
                                <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIButton
                                        onPress={promptAddOtherDocument}
                                        controlSize="regular"
                                        variant="glass"
                                        color="#007AFF"
                                    >
                                        <SwiftUIText size={14} weight="semibold" color="#007AFF">
                                            + Add Other Document
                                        </SwiftUIText>
                                    </SwiftUIButton>
                                </SwiftUIHost>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[s.docCardItem, { justifyContent: 'center', paddingVertical: 14, backgroundColor: bgColor, borderColor }]}
                                onPress={promptAddOtherDocument}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon name="plus.circle.fill" size={16} tintColor="#007AFF" style={{ marginRight: 6 }} />
                                <Text style={{ color: '#007AFF', fontSize: 14, fontWeight: '600' }}>Add Other Document</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                </View>
            </ScrollView>

            {/* Native SwiftUI Document Preview & Management Drawer */}
            <DocumentPreviewDrawer
                visible={!!selectedDoc}
                document={selectedDoc}
                onClose={() => setSelectedDoc(null)}
                onDownload={handleDownloadDoc}
                onChange={(catTitle) => {
                    const matchedCat = defaultDocsMeta.find(m => m.title === catTitle || m.category === catTitle);
                    handleUploadDoc(matchedCat ? matchedCat.category : catTitle);
                }}
                onDelete={(docId, catTitle) => {
                    handleDeleteDoc(docId, catTitle);
                }}
                isDark={isDark}
            />

            {/* NATIVE SWIFTUI LIQUID GLASS CONTAINER ACTION BANNER */}
            {activeSection && (
                <View style={[s.floatingBannerContainer, { bottom: Math.max(insets.bottom, 16) }]}>
                    <SwiftUIUnsavedBanner
                        onCancel={handleCancel}
                        onSave={handleSaveSection}
                        saving={saving}
                        isDark={isDark}
                        title={`Save ${activeSection}`}
                    />
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    section: { gap: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 4 },
    sectionHeaderText: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
    editButtonGlass: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, borderWidth: 0.5, justifyContent: 'center', alignItems: 'center' },
    editTextGlass: { fontSize: 12, fontWeight: '600' },

    card: { borderRadius: 24, overflow: 'hidden' },

    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        minHeight: 52,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 42,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        marginRight: 12,
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    rowValue: {
        fontSize: 15,
        fontWeight: '400',
        flex: 1,
        textAlign: 'right',
        marginLeft: 12,
    },
    pickerRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
        flex: 1,
        marginLeft: 12,
    },

    addressBlock: { padding: 16 },
    detailLabel: { fontSize: 12, fontWeight: '600', letterSpacing: -0.1 },
    addressValue: { fontSize: 15 },

    docTitle: { fontSize: 15, fontWeight: '500', letterSpacing: -0.2 },
    docSubtitle: { fontSize: 12, marginTop: 2, marginRight: 8 },

    // Clean seamless iOS form input
    seamlessInput: {
        fontSize: 15,
        fontWeight: '400',
        textAlign: 'right',
        flex: 1,
        paddingVertical: 0,
        paddingHorizontal: 0,
        marginLeft: 12,
        letterSpacing: 0,
    },
    textarea: {
        fontSize: 15,
        padding: 12,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        textAlignVertical: 'top',
        minHeight: 70,
        letterSpacing: 0,
    },

    // Authentic Liquid Glass Floating Banner
    floatingBannerContainer: {
        position: 'absolute',
        left: 16,
        right: 16,
        alignItems: 'center',
        zIndex: 999,
    },

    // Individual Document Card Styles
    docCardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
    },
    docThumbnailBox: {
        position: 'relative',
        marginRight: 12,
    },
    docThumbnailImg: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#000',
    },
    docIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docMiniCheck: {
        position: 'absolute',
        bottom: -3,
        right: -3,
        backgroundColor: '#FFF',
        borderRadius: 8,
        padding: 1,
    },
    docCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    docCardSub: {
        fontSize: 12,
        fontWeight: '400',
    },
    docPreviewPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
    },
    docPreviewPillText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
