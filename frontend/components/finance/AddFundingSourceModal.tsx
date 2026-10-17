import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    Dimensions,
    Platform,
    Animated,
    TouchableWithoutFeedback,
    useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { supabase } from '@/lib/supabase';
import { PlatformIcon } from '../ui/PlatformIcon';

interface AddFundingSourceModalProps {
    visible: boolean;
    onClose: () => void;
    source?: any | null;
    isEmbedded?: boolean;
}

const BANK_OPTIONS = ['BCA', 'Mandiri', 'BRI', 'BNI', 'BTN', 'BSI', 'Custom'];
const ACCOUNT_TYPES = ['Savings', 'Current', 'Credit', 'Cash'];
const CURRENCY_TYPES = ['IDR', 'USD', 'EUR', 'SGD'];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const AddFundingSourceModal: React.FC<AddFundingSourceModalProps> = ({
    visible,
    onClose,
    source = null,
    isEmbedded = false,
}) => {
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const slideAnim = React.useRef(new Animated.Value(0)).current;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.spring(slideAnim, {
                    toValue: 1,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ]).start();
        } else {
            slideAnim.setValue(0);
            fadeAnim.setValue(0);
        }
    }, [visible, slideAnim, fadeAnim]);

    const handleDismiss = () => {
        if (Platform.OS === 'web' && !isEmbedded) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: false,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: false,
                }),
            ]).start(() => {
                onClose();
            });
        } else {
            onClose();
        }
    };
    
    const { refreshData } = useFinance();

    // Form State
    const [bankIndex, setBankIndex] = useState<number>(0);
    const [customBankName, setCustomBankName] = useState('');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [balanceStr, setBalanceStr] = useState('');
    const [typeIndex, setTypeIndex] = useState<number>(0);
    const [currencyIndex, setCurrencyIndex] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formattedPreview = useMemo(() => {
        const val = parseInt(balanceStr.replace(/[^0-9]/g, ''), 10) || 0;
        return `Rp ${val.toLocaleString('id-ID')}`;
    }, [balanceStr]);

    // Load or reset data
    useEffect(() => {
        if (visible) {
            if (source) {
                const provider = source.provider || '';
                const isCommon = BANK_OPTIONS.slice(0, -1).includes(provider);
                const cleanProvider = isCommon ? provider : 'Custom';
                
                const bIdx = BANK_OPTIONS.indexOf(cleanProvider);
                setBankIndex(bIdx >= 0 ? bIdx : 0);
                setCustomBankName(cleanProvider === 'Custom' ? provider : '');
                
                setAccountName(source.name || '');
                setAccountNumber(source.account_number || '');
                setBalanceStr(String(source.balance || 0));
                
                const tIdx = ACCOUNT_TYPES.indexOf(source.type || 'Savings');
                setTypeIndex(tIdx >= 0 ? tIdx : 0);
                
                const cIdx = CURRENCY_TYPES.indexOf(source.currency || 'IDR');
                setCurrencyIndex(cIdx >= 0 ? cIdx : 0);
            } else {
                setBankIndex(0);
                setCustomBankName('');
                setAccountName('');
                setAccountNumber('');
                setBalanceStr('');
                setTypeIndex(0);
                setCurrencyIndex(0);
            }
            setIsSubmitting(false);
        }
    }, [visible, source]);

    const handleSubmit = async () => {
        const chosenBank = BANK_OPTIONS[bankIndex] === 'Custom' ? customBankName : BANK_OPTIONS[bankIndex];
        
        if (!chosenBank.trim() || !accountName.trim() || !accountNumber.trim()) {
            Alert.alert('Error', 'Please fill in Bank Name, Account Name, and Account Number.');
            return;
        }

        setIsSubmitting(true);
        try {
            const initialBalance = parseInt(balanceStr.replace(/[^0-9]/g, ''), 10) || 0;
            const type = ACCOUNT_TYPES[typeIndex];
            const currency = CURRENCY_TYPES[currencyIndex];

            // Close modal immediately for snappy UI feel
            onClose();

            if (source) {
                // Edit mode
                const { error } = await supabase
                    .from('funding_sources')
                    .update({
                        provider: chosenBank.trim(),
                        name: accountName,
                        account_number: accountNumber,
                        balance: initialBalance,
                        type: type,
                        currency: currency
                    })
                    .eq('id', source.id);

                if (error) throw error;
                Alert.alert('Success', 'Funding source has been updated successfully!');
            } else {
                // Add mode
                const { data: wsData } = await supabase.from('workspaces').select('id').limit(1);
                const wsId = wsData?.[0]?.id || 'f39364e8-1376-4ff7-a716-78277e8d25b3';

                const { error } = await supabase.from('funding_sources').insert([{
                    provider: chosenBank.trim(),
                    name: accountName,
                    account_number: accountNumber,
                    balance: initialBalance,
                    type: type,
                    currency: currency,
                    workspace_id: wsId
                }]);

                if (error) throw error;
                Alert.alert('Success', 'Funding source has been added successfully!');
            }

            await refreshData();
        } catch (error: any) {
            console.error("Submission error:", error);
            Alert.alert('Error', error.message || 'Failed to save funding source.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const containerStyle = isEmbedded 
        ? [s.embeddedContent, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }] 
        : { flex: 1, width: '100%', backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', display: 'flex', flexDirection: 'column' as const };
    const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const inputColor = textColor;

    const renderInnerContent = () => (
        <View style={containerStyle}>
            {/* Header */}
            <View style={[s.header, isEmbedded && { paddingTop: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                <Text style={[s.headerTitle, { color: textColor }]}>
                    {source ? "Edit Funding Source" : "New Funding Source"}
                </Text>
                <TouchableOpacity onPress={handleDismiss} disabled={isSubmitting} style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(120,120,128,0.1)' }]}>
                    <PlatformIcon name="xmark" size={16} tintColor={subtextColor} />
                </TouchableOpacity>
            </View>

                    {/* Scrollable Form */}
                    <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        
                        {/* Section 1: Account Identity */}
                        <Text style={[s.sectionTitle, { color: subtextColor }]}>ACCOUNT IDENTITY</Text>
                        <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                            
                            {/* Bank Picker Pills */}
                            <Text style={[s.inputLabel, { color: subtextColor }]}>Bank Provider</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsScroll}>
                                {BANK_OPTIONS.map((opt, idx) => {
                                    const isSelected = idx === bankIndex;
                                    return (
                                        <TouchableOpacity
                                            key={opt}
                                            style={[
                                                s.pill,
                                                { 
                                                    backgroundColor: isSelected 
                                                        ? (isDark ? '#3A3A3C' : '#FFF') 
                                                        : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                                                    borderWidth: 1.5,
                                                    borderColor: isSelected 
                                                        ? (isDark ? '#545456' : '#E5E5EA') 
                                                        : 'transparent'
                                                }
                                            ]}
                                            onPress={() => setBankIndex(idx)}
                                        >
                                            <Text style={[s.pillText, { color: isSelected ? (isDark ? '#FFF' : '#000') : textColor }]}>{opt}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {BANK_OPTIONS[bankIndex] === 'Custom' && (
                                <TextInput
                                    style={[s.input, { backgroundColor: inputBg, color: inputColor }]}
                                    placeholder="Enter Bank or Provider Name"
                                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                    value={customBankName}
                                    onChangeText={setCustomBankName}
                                />
                            )}

                            <TextInput
                                style={[s.input, { backgroundColor: inputBg, color: inputColor, marginTop: 12 }]}
                                placeholder="Account Holder Name"
                                placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                value={accountName}
                                onChangeText={setAccountName}
                            />

                            <TextInput
                                style={[s.input, { backgroundColor: inputBg, color: inputColor, marginTop: 12 }]}
                                placeholder="Account Number"
                                placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                keyboardType="numeric"
                                value={accountNumber}
                                onChangeText={setAccountNumber}
                            />
                        </View>

                        {/* Section 2: Balance Info */}
                        <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 24 }]}>BALANCE INFO</Text>
                        <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                            <TextInput
                                style={[s.input, { backgroundColor: inputBg, color: inputColor }]}
                                placeholder="Initial Balance"
                                placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                keyboardType="numeric"
                                value={balanceStr}
                                onChangeText={setBalanceStr}
                            />
                            {balanceStr.trim().length > 0 && (
                                <Text style={[s.balancePreview, { color: '#007AFF' }]}>
                                    {formattedPreview}
                                </Text>
                            )}
                        </View>

                        {/* Section 3: Account Type */}
                        <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 24 }]}>ACCOUNT TYPE</Text>
                        <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                            <View style={s.segmentedContainer}>
                                {ACCOUNT_TYPES.map((type, idx) => {
                                    const isSelected = idx === typeIndex;
                                    return (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                s.segmentButton,
                                                isSelected && { backgroundColor: isDark ? '#3A3A3C' : '#FFF' }
                                            ]}
                                            onPress={() => setTypeIndex(idx)}
                                        >
                                            <Text style={[s.segmentText, { color: textColor, fontWeight: isSelected ? '700' : '400' }]}>
                                                {type}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Section 4: Currency */}
                        <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 24 }]}>CURRENCY</Text>
                        <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                            <View style={s.segmentedContainer}>
                                {CURRENCY_TYPES.map((curr, idx) => {
                                    const isSelected = idx === currencyIndex;
                                    return (
                                        <TouchableOpacity
                                            key={curr}
                                            style={[
                                                s.segmentButton,
                                                isSelected && { backgroundColor: isDark ? '#3A3A3C' : '#FFF' }
                                            ]}
                                            onPress={() => setCurrencyIndex(idx)}
                                        >
                                            <Text style={[s.segmentText, { color: textColor, fontWeight: isSelected ? '700' : '400' }]}>
                                                {curr}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={s.footer}>
                        <TouchableOpacity 
                            style={[s.footerButton, s.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]} 
                            onPress={handleDismiss}
                            disabled={isSubmitting}
                        >
                            <Text style={[s.footerBtnText, { color: isDark ? '#FFF' : '#333' }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[s.footerButton, s.confirmButton, isSubmitting && { opacity: 0.5 }]} 
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={[s.footerBtnText, { color: '#FFF' }]}>Save Fund</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                </View>
    );

    if (isEmbedded) {
        return renderInnerContent();
    }

    return (
        <Modal visible={visible} animationType="none" transparent={true} onRequestClose={handleDismiss} statusBarTranslucent={true}>
            <View style={[s.overlay, isDesktop && s.modalOverlayWeb]}>
                <TouchableWithoutFeedback onPress={handleDismiss}>
                    <Animated.View style={[s.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>
                <Animated.View
                    style={[
                        s.content,
                        isDesktop && s.modalContentWeb,
                        {
                            transform: [
                                {
                                    translateX: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [isDesktop ? 500 : 0, 0],
                                    }),
                                },
                                {
                                    translateY: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [isDesktop ? 0 : 600, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    {renderInnerContent()}
                </Animated.View>
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    embeddedContent: {
        flex: 1,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    overlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.4)', 
        justifyContent: 'flex-end',
        paddingHorizontal: 0,
        paddingBottom: 0,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    content: { 
        borderRadius: Platform.OS === 'ios' ? 56 : 40,
        borderBottomLeftRadius: Platform.OS === 'ios' ? 56 : 0,
        borderBottomRightRadius: Platform.OS === 'ios' ? 56 : 0,
        height: '92%', 
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: Platform.OS === 'android' ? 16 : 10,
        overflow: 'hidden',
    },
    modalOverlayWeb: {
        padding: 12,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    modalContentWeb: {
        position: 'absolute',
        top: 12,
        bottom: 12,
        right: 12,
        width: 480,
        maxWidth: 'calc(100% - 24px)' as any,
        borderRadius: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderWidth: 1,
        height: 'calc(100% - 24px)' as any,
        maxHeight: 'none' as any,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? ({
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18), 0 2px 12px rgba(0, 0, 0, 0.08)',
        } as any) : {}),
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
        fontWeight: '700' 
    },
    scrollContent: { 
        padding: 20, 
        paddingBottom: 40 
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 8
    },
    sectionCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8
    },
    pillsScroll: {
        flexDirection: 'row',
        marginBottom: 12
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 9999,
        marginRight: 8
    },
    pillText: {
        fontSize: 14,
        fontWeight: '600'
    },
    input: {
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 18,
        fontSize: 15,
        fontWeight: '500'
    },
    balancePreview: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 10,
        textAlign: 'right'
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(120, 120, 128, 0.12)',
        borderRadius: 24,
        padding: 2
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22
    },
    segmentText: {
        fontSize: 13
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        gap: 12
    },
    footerButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center'
    },
    cancelButton: {},
    confirmButton: {
        backgroundColor: '#007AFF'
    },
    footerBtnText: {
        fontSize: 16,
        fontWeight: '700'
    }
});
